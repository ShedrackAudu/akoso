// Shapes for schools (tenants), shared by the server and the apps (brief section 7;
// spec docs/specs/stage-1-tenancy.md).
import { z } from "zod"

export const SCHOOL_STATUSES = [
  /** Created, being set up. */
  "onboarding",
  "active",
  /** Paused by Akoso: every request refused. */
  "suspended",
  /** Leaving: reads allowed, writes refused (brief 26.7). */
  "read_only",
  /** Gone; data kept only for the retention period. */
  "closed",
] as const
export const schoolStatusSchema = z.enum(SCHOOL_STATUSES)
export type SchoolStatus = z.infer<typeof schoolStatusSchema>

/**
 * Names Akoso needs for itself, so no school can take them as its address. Checked when
 * a school is created or renamed; the database checks only the format.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "about",
  "account",
  "admin",
  "api",
  "app",
  "apps",
  "assets",
  "auth",
  "billing",
  "blog",
  "branch",
  "branches",
  "cdn",
  "custom",
  "dashboard",
  "demo",
  "dev",
  "docs",
  "email",
  "ftp",
  "group",
  "groups",
  "health",
  "help",
  "home",
  "images",
  "img",
  "internal",
  "login",
  "logout",
  "mail",
  "media",
  "metrics",
  "mobile",
  "news",
  "pay",
  "payments",
  "platform",
  "portal",
  "preview",
  "pricing",
  "privacy",
  "public",
  "school",
  "schools",
  "secure",
  "security",
  "settings",
  "signin",
  "spike",
  "sign-out",
  "sign-in",
  "signup",
  "smtp",
  "sso",
  "staff",
  "staging",
  "static",
  "status",
  "support",
  "system",
  "terms",
  "test",
  "webhook",
  "webhooks",
  "www",
])

/** A school's address name: greenfield in greenfield.akoso.ng. */
export const schoolSlugSchema = z
  .string()
  .min(3, "A school address needs at least 3 characters.")
  .max(40, "A school address can have at most 40 characters.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lower-case letters, numbers and single hyphens only, e.g. greenfield-academy."
  )
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: "This address is reserved. Please choose another.",
  })

/** What the request pipeline and public pages know about a school. Nothing private. */
export const schoolSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  status: schoolStatusSchema,
  timeZone: z.string(),
})
export type SchoolSummary = z.infer<typeof schoolSummarySchema>
