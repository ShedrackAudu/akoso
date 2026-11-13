// Small checks the part B use cases share (spec: docs/specs/stage-1-sign-in-part-b.md).
import { sql, type Database } from "@akoso/db"

import {
  NotFoundError,
  ReauthRequiredError,
  type RequestContext,
} from "../kernel/index"

type Executor = Pick<Database, "execute">

/** How recent a sign-in a risky change needs (section 1, rule 6). */
export const RECENT_SIGN_IN_MINUTES = 10

/** The signed-in person's ID. Use cases here are for people, never the worker. */
export function userIdOf(ctx: RequestContext): string {
  if (ctx.actor.kind !== "user") throw new NotFoundError()
  return ctx.actor.userId
}

/** The actor holds this built-in role in the request's school. */
export function actorHolds(ctx: RequestContext, role: string): boolean {
  return ctx.actor.kind === "user" && ctx.actor.roles.includes(role)
}

/** Refuses unless this session signed in within the last few minutes. */
export function requireRecentSignIn(ctx: RequestContext): void {
  if (ctx.actor.kind !== "user") return
  const signedInAt = ctx.actor.signedInAt?.getTime()
  const limit = RECENT_SIGN_IN_MINUTES * 60 * 1000
  if (signedInAt === undefined || ctx.now().getTime() - signedInAt > limit) {
    throw new ReauthRequiredError()
  }
}

/** Signs a person out everywhere: role, number and second-step changes (brief 6). */
export async function revokeSessions(
  db: Executor,
  userId: string
): Promise<void> {
  await db.execute(sql`delete from platform.sessions where user_id = ${userId}`)
}

/** Postgres's "unique violation" (also raised by the phone-number trigger). */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** A phone number's last three digits, for records that must not hold the number. */
export const numberEnding = (phone: string): string => phone.slice(-3)

/** An email that is real, not the placeholder phone-only people are given. */
export const isRealEmail = (email: string): boolean =>
  !email.endsWith(".invalid")

/** A text column's value, or null. Raw queries return text and timestamps as strings. */
export const textOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null

/** A timestamp column as an ISO string, or null. */
export const isoOrNull = (value: unknown): string | null =>
  typeof value === "string" || value instanceof Date
    ? new Date(value).toISOString()
    : null
