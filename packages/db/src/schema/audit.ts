// The audit log (spec: docs/specs/stage-1-time-audit-flags.md, section 2). Append-only
// and hash-chained per school; the chain is computed by a database trigger, in the
// hand-written migration beside the generated one.
import {
  bigint,
  index,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { platform } from "./kernel"
import { tenants } from "./tenancy"

/**
 * One change to a school's data. seq, prev_hash and hash are set by the trigger; any
 * value the application sends for them, or for occurred_at, is replaced.
 */
export const auditEvents = platform.table(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    seq: bigint("seq", { mode: "number" }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** "user:<id>" or "system:<job>". Internal IDs only, never names. */
    actor: text("actor").notNull(),
    /** e.g. membership.roles.changed */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** { field: { before, after } } or { field: { changed: true } } for sensitive fields. */
    changes: jsonb("changes").notNull().default({}),
    requestId: text("request_id"),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (table) => [
    unique("audit_events_tenant_seq_unique").on(table.tenantId, table.seq),
    index("audit_events_tenant_entity_idx").on(
      table.tenantId,
      table.entityType,
      table.entityId
    ),
  ]
)

/** The newest record of each school's chain. Touched only by the trigger. */
export const auditChainHeads = platform.table("audit_chain_heads", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id),
  lastSeq: bigint("last_seq", { mode: "number" }).notNull(),
  lastHash: text("last_hash").notNull(),
})
