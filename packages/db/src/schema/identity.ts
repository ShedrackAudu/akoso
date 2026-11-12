// People, sign-in and memberships (spec: docs/specs/stage-1-sign-in.md). The first five
// tables are Better Auth's, mapped to Akoso's naming. Grants, checks, RLS and the
// lookup functions are in the hand-written migration beside the generated one.
import {
  boolean,
  index,
  integer,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { platform } from "./kernel"
import { tenants } from "./tenancy"

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow()
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()

/**
 * One person, across every school. Phone-only parents get a placeholder email on the
 * reserved `.invalid` domain, because Better Auth requires one; it is never shown and
 * never emailed.
 */
export const users = platform.table("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** E.164, e.g. +2348031234567. */
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified")
    .notNull()
    .default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt,
  updatedAt,
})

/** Password hashes (Better Auth's "account" model, credential provider only). */
export const userCredentials = platform.table(
  "user_credentials",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
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
    /** scrypt hash. */
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("user_credentials_provider_account_unique").on(
      table.providerId,
      table.accountId
    ),
    index("user_credentials_user_id_idx").on(table.userId),
  ]
)

export const sessions = platform.table(
  "sessions",
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
      .references(() => users.id),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
)

/** One-time codes and reset tokens. Phone codes are stored as keyed hashes only. */
export const verifications = platform.table(
  "verifications",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
)

/** Authenticator secrets and backup codes, both encrypted with the server secret. */
export const twoFactors = platform.table(
  "two_factors",
  {
    id: uuid("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count")
      .notNull()
      .default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [
    index("two_factors_user_id_idx").on(table.userId),
    index("two_factors_secret_idx").on(table.secret),
  ]
)

/** A person's place in one school, with their roles there. A tenant table. */
export const memberships = platform.table(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** Role keys from docs/permissions.md, e.g. {teacher,guardian}. */
    roles: text("roles").array().notNull(),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    createdAt,
    updatedAt,
    createdBy: text("created_by"),
  },
  (table) => [
    unique("memberships_tenant_user_unique").on(table.tenantId, table.userId),
    index("memberships_tenant_created_idx").on(table.tenantId, table.createdAt),
  ]
)

/**
 * Sign-in and account-security events, per person (brief section 6). Append-only for
 * the app role. Never holds codes, tokens or passwords.
 */
export const securityEvents = platform.table(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    kind: text("kind").notNull(),
    /** A short reason code, e.g. wrong_password. Never free text from a request. */
    detail: text("detail"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    index("security_events_user_created_idx").on(table.userId, table.createdAt),
  ]
)
