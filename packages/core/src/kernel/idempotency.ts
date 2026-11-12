// Idempotent writes (spec section 5). The first request with a key runs; a repeat with
// the same key and the same request gets the stored response without running again.
import { createHash } from "node:crypto"

import { sql, withTenant, type Database } from "@akoso/db"

import { ConflictError, IdempotencyMismatchError } from "./errors"

/** A key left `running` this long is assumed abandoned (the process died mid-request). */
const ABANDONED_AFTER_SECONDS = 120

export interface IdempotencyScope {
  db: Database
  tenantId: string
  userId: string
  key: string
}

export type IdempotencyStart =
  { kind: "new" } | { kind: "replay"; status: number; body: unknown }

/** SHA-256 of what makes two requests "the same request". */
export function hashRequest(
  method: string,
  path: string,
  body: string
): string {
  return createHash("sha256")
    .update(`${method}\n${path}\n${body}`)
    .digest("hex")
}

/**
 * Claims the key for this request, or reports what happened to the first one.
 *
 * @throws IdempotencyMismatchError when the key was used for a different request.
 * @throws ConflictError while the first request with this key is still running.
 */
export async function beginIdempotent(
  scope: IdempotencyScope,
  requestHash: string
): Promise<IdempotencyStart> {
  return withTenant(scope.db, scope.tenantId, async (tx) => {
    const inserted = await tx.execute(sql`
      insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
      values (${scope.tenantId}, ${scope.userId}, ${scope.key}, ${requestHash}, 'running')
      on conflict do nothing
      returning key`)
    if ((inserted.rowCount ?? 0) > 0) return { kind: "new" }

    const existing = await tx.execute(sql`
      select request_hash, state, response_status, response_body,
             created_at < now() - interval '24 hours' as expired,
             state = 'running' and created_at < now() - make_interval(secs => ${ABANDONED_AFTER_SECONDS}) as abandoned
      from platform.idempotency_keys
      where tenant_id = ${scope.tenantId} and user_id = ${scope.userId} and key = ${scope.key}
      for update`)
    const row = existing.rows[0]
    if (row === undefined) {
      // Purged between the two statements: treat as new on the client's retry.
      throw new ConflictError("Please try again.")
    }
    if (row.expired === true || row.abandoned === true) {
      await tx.execute(sql`
        update platform.idempotency_keys
        set request_hash = ${requestHash}, state = 'running', response_status = null,
            response_body = null, created_at = now()
        where tenant_id = ${scope.tenantId} and user_id = ${scope.userId} and key = ${scope.key}`)
      return { kind: "new" }
    }
    if (row.request_hash !== requestHash) throw new IdempotencyMismatchError()
    if (row.state === "running") {
      throw new ConflictError("The first attempt is still being processed.")
    }
    return {
      kind: "replay",
      status: Number(row.response_status),
      body: row.response_body,
    }
  })
}

/** Stores the response, so a repeat of this request gets it back. */
export async function finishIdempotent(
  scope: IdempotencyScope,
  status: number,
  body: unknown
): Promise<void> {
  await withTenant(scope.db, scope.tenantId, (tx) =>
    tx.execute(sql`
      update platform.idempotency_keys
      set state = 'done', response_status = ${status}, response_body = ${JSON.stringify(body)}::jsonb
      where tenant_id = ${scope.tenantId} and user_id = ${scope.userId} and key = ${scope.key}`)
  )
}

/** Forgets the key after an unexpected failure, so the client's retry runs again. */
export async function releaseIdempotent(
  scope: IdempotencyScope
): Promise<void> {
  await withTenant(scope.db, scope.tenantId, (tx) =>
    tx.execute(sql`
      delete from platform.idempotency_keys
      where tenant_id = ${scope.tenantId} and user_id = ${scope.userId} and key = ${scope.key}
        and state = 'running'`)
  )
}
