// Rate limits (spec section 6): fixed one-minute windows counted in Postgres, shared by
// every web instance. Each request counts against its user, its school and its IP.
import { createHash } from "node:crypto"

import { sql, type Database } from "@akoso/db"
import type { RateLimitClass } from "@akoso/schemas/api"

import { RateLimitedError } from "./errors"
import { getSetting } from "./settings"

type Scope = "user" | "tenant" | "ip"

const WINDOW_SECONDS = 60

export interface RateLimitSubject {
  userId?: string | null
  tenantId?: string | null
  ip?: string | null
}

// Buckets are hashes, so the counts table holds no user IDs, phone numbers or IP
// addresses.

/**
 * Counts one request and throws when any limit for it is exceeded.
 *
 * @throws RateLimitedError with the seconds left in the current window.
 */
export async function consumeRateLimit(
  db: Database,
  cls: RateLimitClass,
  subject: RateLimitSubject,
  now: () => Date
): Promise<void> {
  const checks: LimitCheck[] = []
  if (cls === "none") return
  // Per-minute numbers come from platform settings (limits.api; closes T16).
  const limits = (await getSetting(db, "limits.api"))[cls] as Partial<
    Record<Scope, number>
  >
  for (const [scope, limit] of Object.entries(limits) as [Scope, number][]) {
    const id =
      scope === "user"
        ? subject.userId
        : scope === "tenant"
          ? subject.tenantId
          : subject.ip
    if (id) {
      checks.push({
        key: `${cls}:${scope}:${id}`,
        limit,
        windowSeconds: WINDOW_SECONDS,
      })
    }
  }
  await consumeLimits(db, checks, now)
}

/** One limit to count against: at most `limit` hits per `windowSeconds`. */
export interface LimitCheck {
  /** What is being counted, e.g. "sign-in-code:phone:+234...". Hashed before storing. */
  key: string
  limit: number
  /** 1 to 86,400 seconds. */
  windowSeconds: number
}

/**
 * Counts one hit against each limit and throws when any is exceeded. For limits that
 * are not a request class, such as sign-in codes per phone number per day.
 *
 * @throws RateLimitedError with the seconds left in the longest exceeded window.
 */
export async function consumeLimits(
  db: Database,
  checks: readonly LimitCheck[],
  now: () => Date
): Promise<void> {
  if (checks.length === 0) return
  // The window is part of the bucket, so a 15-minute and a daily count of the same
  // thing never share (and so never clear) each other's rows.
  const buckets = checks.map((check) =>
    createHash("sha256")
      .update(`${check.key}:${String(check.windowSeconds)}`)
      .digest("hex")
  )
  const counts = sql.join(
    checks.map(
      (check, index) =>
        sql`platform.hit_rate_limit(${buckets[index]}, ${check.windowSeconds}) as ${sql.raw(`c${String(index)}`)}`
    ),
    sql`, `
  )
  const result = await db.execute(sql`select ${counts}`)
  const row = result.rows[0] ?? {}
  const exceeded = checks.filter(
    (check, index) => Number(row[`c${String(index)}`]) > check.limit
  )
  if (exceeded.length > 0) {
    const seconds = Math.floor(now().getTime() / 1000)
    const wait = Math.max(
      ...exceeded.map(
        (check) => check.windowSeconds - (seconds % check.windowSeconds)
      )
    )
    throw new RateLimitedError(wait)
  }
}
