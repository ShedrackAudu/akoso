// Akoso team accounts for the admin app (spec: docs/specs/stage-1-sign-in-part-b.md,
// section 8). Entirely separate from school accounts: their own people, sessions,
// passkeys and records. The first four tables are Better Auth's, mapped to Akoso's
// naming. Grants, checks and the audit chain are in the hand-written migration.
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { platform } from "./kernel"

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow()
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()

/** A member of the Akoso team. No password: passkeys only. */
export const teamUsers = platform.table("team_users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(true),
  image: text("image"),
  createdAt,
  updatedAt,
  /** Set when the Owner removes their access; their sessions and passkeys go too. */
  removedAt: timestamp("removed_at", { withTimezone: true }),
})

export const teamSessions = platform.table(
  "team_sessions",
  {
    id: uuid("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt,
    updatedAt,
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
  },
  (table) => [index("team_sessions_user_id_idx").on(table.userId)]
)

/**
 * Better Auth's "account" model, which it requires even with passwords switched off.
 * Team members have no password and no outside sign-in, so this stays empty; the
 * password column is refused by a database check.
 */
export const teamAccounts = platform.table(
  "team_accounts",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (table) => [index("team_accounts_user_id_idx").on(table.userId)]
)

/** WebAuthn challenges, and the short tickets that let someone register a passkey. */
export const teamVerifications = platform.table(
  "team_verifications",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("team_verifications_identifier_idx").on(table.identifier)]
)

/** Passkeys: public keys only. */
export const teamPasskeys = platform.table(
  "team_passkeys",
  {
    id: uuid("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
    credentialID: text("credential_id").notNull().unique(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt,
    aaguid: text("aaguid"),
  },
  (table) => [index("team_passkeys_user_id_idx").on(table.userId)]
)

/** Team roles (brief 26.2). One person can hold several. */
export const teamRoleGrants = platform.table(
  "team_role_grants",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
    role: text("role").notNull(),
    grantedBy: uuid("granted_by").references(() => teamUsers.id),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })]
)

/** Single-use enrolment links. Only the token's SHA-256 is stored. */
export const teamInvitations = platform.table(
  "team_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** Null for the first Owner, made by the command line. */
    createdBy: uuid("created_by").references(() => teamUsers.id),
    createdAt,
  },
  (table) => [index("team_invitations_user_id_idx").on(table.userId)]
)

/** One-time recovery codes, as keyed hashes. */
export const teamRecoveryCodes = platform.table(
  "team_recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => teamUsers.id),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [index("team_recovery_codes_user_id_idx").on(table.userId)]
)

/** Sign-in and account-security events for team members. Append-only. */
export const teamSecurityEvents = platform.table(
  "team_security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => teamUsers.id),
    kind: text("kind").notNull(),
    detail: text("detail"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    index("team_security_events_created_idx").on(table.createdAt),
    index("team_security_events_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
)

/**
 * Every Akoso team action, hash-chained like a school's audit log (item 6), in one
 * chain for the whole team. Append-only; the trigger fills seq, time and hashes.
 */
export const teamAuditEvents = platform.table("team_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  seq: bigint("seq", { mode: "number" }).notNull().unique(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes").notNull().default({}),
  requestId: text("request_id"),
  prevHash: text("prev_hash").notNull(),
  hash: text("hash").notNull(),
})

/** The team chain's head: one row, reachable only by the chain trigger. */
export const teamAuditChainHead = platform.table("team_audit_chain_head", {
  id: integer("id").primaryKey(),
  lastSeq: bigint("last_seq", { mode: "number" }).notNull(),
  lastHash: text("last_hash").notNull(),
})
