// Writing to the audit log (spec: stage-1-time-audit-flags.md, section 2). Called by a
// use case inside the same withTenant() transaction as the change it records, so the
// record and the change commit or roll back together. The database trigger sets the
// sequence number, the time and the hash chain.
import { sql, type TenantTransaction } from "@akoso/db"

import { requireTenant, type RequestContext } from "../kernel/index"

/** One field's change. Sensitive fields record only that they changed. */
export type FieldChange =
  { before: unknown; after: unknown } | { changed: true }

export interface AuditEvent {
  /** e.g. membership.roles.changed */
  action: `${string}.${string}`
  entityType: string
  entityId: string
  changes?: Record<string, FieldChange>
}

/** Who acted, as internal IDs only (brief section 28.3): never a name. */
function actorOf(ctx: RequestContext): string {
  return ctx.actor.kind === "user"
    ? `user:${ctx.actor.userId}`
    : `system:${ctx.actor.job}`
}

export async function recordAudit(
  tx: TenantTransaction,
  ctx: RequestContext,
  event: AuditEvent
): Promise<void> {
  await tx.execute(sql`
    insert into platform.audit_events
      (tenant_id, actor, action, entity_type, entity_id, changes, request_id)
    values (${requireTenant(ctx)}, ${actorOf(ctx)}, ${event.action},
            ${event.entityType}, ${event.entityId},
            ${JSON.stringify(event.changes ?? {})}::jsonb, ${ctx.requestId})`)
}

/**
 * The changes between two versions of a record, field by field. Fields named in
 * `sensitive` (health data, national IDs, bank details, restricted notes, custody
 * restrictions) record only that they changed, never a value.
 *
 * @param before The record before the change, or null when it is being created.
 * @param after The record after the change, or null when it is being deleted.
 */
export function diffForAudit(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  sensitive: readonly string[] = []
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {}
  const fields = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ])
  for (const field of fields) {
    const was = before?.[field] ?? null
    const now = after?.[field] ?? null
    if (JSON.stringify(was) === JSON.stringify(now)) continue
    changes[field] = sensitive.includes(field)
      ? { changed: true }
      : { before: was, after: now }
  }
  return changes
}
