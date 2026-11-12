// Rate limits (spec section 6): fixed one-minute windows counted in Postgres, shared by
// every web instance. Each request counts against its user, its school and its IP.
import { createHash } from "node:crypto"

import { sql, type Database } from "@akoso/db"
import type { RateLimitClass } from "@akoso/schemas/api"

import { RateLimitedError } from "./errors"

type Scope = "user" | "tenant" | "ip"

const WINDOW_SECONDS = 60

/**
 * Requests allowed per minute, by limit class and scope. Starting values, to be tuned
 * from staging and pilot traffic. They move to platform settings with feature flags
 * (brief rule 10: limits are data). Sign-in and OTP limits belong to the auth slice.
 */
export const RATE_LIMITS: Record<
  RateLimitClass,
  Partial<Record<Scope, number>>
> = {
  standard: { user: 120, tenant: 1200, ip: 300 },
  write: { user: 60, tenant: 600, ip: 120 },
  export: { user: 5, tenant: 20, ip: 10 },
  public: { ip: 60 },
  none: {},
}

export interface RateLimitSubject {
  userId?: string | null
  tenantId?: string | null
  ip?: string | null
}

// Buckets are hashes, so the counts table holds no user IDs or IP addresses.
const bucketFor = (cls: RateLimitClass, scope: Scope, id: string): string =>
  createHash("sha256").update(`${cls}:${scope}:${id}`).digest("hex")

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
  const checks: { bucket: string; limit: number }[] = []
  for (const [scope, limit] of Object.entries(RATE_LIMITS[cls]) as [
    Scope,
    number,
  ][]) {
    const id =
      scope === "user"
        ? subject.userId
        : scope === "tenant"
          ? subject.tenantId
          : subject.ip
    if (id) checks.push({ bucket: bucketFor(cls, scope, id), limit })
  }
  if (checks.length === 0) return

  const counts = sql.join(
    checks.map(
      (check, index) =>
        sql`platform.hit_rate_limit(${check.bucket}, ${WINDOW_SECONDS}) as ${sql.raw(`c${String(index)}`)}`
    ),
    sql`, `
  )
  const result = await db.execute(sql`select ${counts}`)
  const row = result.rows[0] ?? {}
  const exceeded = checks.some(
    (check, index) => Number(row[`c${String(index)}`]) > check.limit
  )
  if (exceeded) {
    const seconds = Math.floor(now().getTime() / 1000)
    throw new RateLimitedError(WINDOW_SECONDS - (seconds % WINDOW_SECONDS))
  }
}
