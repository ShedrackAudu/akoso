// The context every use case receives (spec: stage-1-api-and-service-conventions.md,
// section 1). It is built once per request or job by the route handler, server action
// or worker, never by the use case itself.
import { randomBytes } from "node:crypto"

import type { ActionKey } from "@akoso/schemas/api"

import type { Database } from "@akoso/db"

import type { Logger } from "./logger"

/** A signed-in person. Roles and permissions come from sign-in (Stage 1, item 5). */
export interface UserActor {
  kind: "user"
  userId: string
  roles: readonly string[]
  permissions: ReadonlySet<ActionKey>
}

/** The worker acting on its own schedule or for a queued job. */
export interface SystemActor {
  kind: "system"
  job: string
}

export type Actor = UserActor | SystemActor

/** For signed-in requests and jobs. */
export interface RequestContext {
  /** New for every request; carried into any job it queues. */
  requestId: string
  actor: Actor
  /**
   * The school this request is for, already checked against the actor's memberships.
   * Null for platform-level actions. Tenant data is reached only through
   * `withTenant(ctx.db, ctx.tenantId, ...)`.
   */
  tenantId: string | null
  db: Database
  /** The server's clock. Never a phone's (brief section 3.1). */
  now: () => Date
  log: Logger
}

/** For public endpoints: nobody is signed in and no school is chosen. */
export interface PublicContext {
  requestId: string
  db: Database
  now: () => Date
  log: Logger
}

/** A new request ID: `req_` and 26 random lower-case base-32 characters. */
export function newRequestId(): string {
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz"
  const bytes = randomBytes(26)
  let id = "req_"
  for (const byte of bytes) id += alphabet[byte % 32] ?? "0"
  return id
}

/** The tenant of a context that must have one; a platform-level context is a bug here. */
export function requireTenant(ctx: RequestContext): string {
  if (ctx.tenantId === null) {
    throw new Error("This use case needs a school, but the context has none")
  }
  return ctx.tenantId
}
