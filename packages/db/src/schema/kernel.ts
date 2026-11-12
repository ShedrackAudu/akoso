// Tables behind the request plumbing every module shares (spec:
// stage-1-api-and-service-conventions.md). Row-level security, grants and the
// rate-limit function are in the hand-written migration next to the generated one,
// because Drizzle cannot express FORCE ROW LEVEL SECURITY or SECURITY DEFINER.
import {
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const platform = pgSchema("platform")

/**
 * Writes already handled, by idempotency key, kept for 24 hours so a retried request
 * gets the first response instead of running twice. A tenant table: RLS is enabled
 * and forced, and the key is scoped to one user in one school.
 */
export const idempotencyKeys = platform.table(
  "idempotency_keys",
  {
    tenantId: uuid("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    /** SHA-256 of the method, path and body, so a reused key with a new body is caught. */
    requestHash: text("request_hash").notNull(),
    /** `running` until the use case finishes, then `done`. */
    state: text("state", { enum: ["running", "done"] }).notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.userId, table.key] }),
  ]
)

/**
 * Request counts per one-minute window. Unlogged (counts need not survive a crash) and
 * holding no personal data: `bucket` is a hash. The app role cannot touch it directly;
 * it may only call `platform.hit_rate_limit()`.
 */
export const rateLimitWindows = platform.table(
  "rate_limit_windows",
  {
    bucket: text("bucket").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.bucket, table.windowStart] })]
)
