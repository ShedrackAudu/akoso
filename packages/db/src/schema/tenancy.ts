// Schools (tenants), groups and school domains (spec: docs/specs/stage-1-tenancy.md).
// Grants, checks, RLS and the lookup functions are in the hand-written migration beside
// the generated one.
import {
  boolean,
  jsonb,
  index,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { platform } from "./kernel"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** The user who created the row. Nullable until sign-in exists (Stage 1, item 5). */
  createdBy: text("created_by"),
}

export const SCHOOL_STATUSES = [
  "onboarding",
  "active",
  "suspended",
  "read_only",
  "closed",
] as const

export const DOMAIN_STATUSES = [
  "pending_dns",
  "verifying",
  "active",
  "failing",
  "removed",
] as const

/** An owner's set of schools. A branch is a school in a group. */
export const groups = platform.table("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...timestamps,
})

/** One school using Akoso. Every school-owned row elsewhere carries its ID. */
export const tenants = platform.table(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").references(() => groups.id),
    /** The address name: greenfield in greenfield.akoso.ng. Lower-case, unique. */
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: text("status", { enum: SCHOOL_STATUSES })
      .notNull()
      .default("onboarding"),
    /** IANA time zone; every "today" and deadline uses it (brief section 3.1). */
    timeZone: text("time_zone").notNull().default("Africa/Lagos"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [index("tenants_group_id_idx").on(table.groupId)]
)

/**
 * A school's own domain (brief 7.1). A tenant table: the school will manage it in its
 * settings. Routing reads only active rows, through platform.tenant_by_host().
 */
export const tenantDomains = platform.table(
  "tenant_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    hostname: text("hostname").notNull().unique(),
    status: text("status", { enum: DOMAIN_STATUSES })
      .notNull()
      .default("pending_dns"),
    /** SHA-256 of the DNS verification token; the token itself is never stored. */
    verificationTokenHash: text("verification_token_hash"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("tenant_domains_tenant_created_idx").on(
      table.tenantId,
      table.createdAt
    ),
  ]
)

/**
 * A feature turned on or off for one school (spec: stage-1-time-audit-flags.md,
 * section 3). Flags are declared in code (packages/schemas/src/flags.ts); this table
 * holds only overrides. A tenant table the app role may read, never change.
 */
export const tenantFeatureFlags = platform.table(
  "tenant_feature_flags",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    flagKey: text("flag_key").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by"),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.flagKey] })]
)

/**
 * A school's own settings, such as which roles must use a second step (spec:
 * stage-1-sign-in-part-b.md, section 2). Declared with defaults in code
 * (packages/schemas/src/school-settings.ts); this table holds only overrides. A tenant
 * table the app role reads and writes through the identity and tenancy use cases.
 */
export const schoolSettings = platform.table(
  "school_settings",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by"),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.key] })]
)
