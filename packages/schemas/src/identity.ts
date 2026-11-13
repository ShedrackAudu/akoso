// Inputs for the identity module's server actions (spec: docs/specs/stage-1-sign-in-part-b.md).
// Shared by the use cases and the screens, so both check the same rules.
import { z } from "zod"

import { ROLE_KEYS } from "./permissions"

/** The school a school-scoped action is for: its slug, as in the page's address. */
const schoolSlugSchema = z.string().min(1).max(63)

/** A phone number as typed (0803…, +234 803…); the server normalises it. */
const typedPhoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(20)

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code")

const personNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(200, "Use 200 characters or fewer")

// People with access (section 1).

export const MEMBER_FILTERS = ["staff", "guardians", "all"] as const

export const listMembersInput = z.object({
  school: schoolSlugSchema,
  filter: z.enum(MEMBER_FILTERS).default("staff"),
  search: z.string().trim().max(100).default(""),
  cursor: z.string().max(500).optional(),
})

export const changeMemberRolesInput = z.object({
  school: schoolSlugSchema,
  membershipId: z.uuid(),
  roles: z.array(z.enum(ROLE_KEYS)).min(1, "Choose at least one role").max(12),
  customRoleIds: z.array(z.uuid()).max(50).default([]),
})

export const setMembershipStatusInput = z.object({
  school: schoolSlugSchema,
  membershipId: z.uuid(),
  status: z.enum(["active", "suspended"]),
})

// Custom roles (section 2).

export const saveCustomRoleInput = z.object({
  school: schoolSlugSchema,
  /** Absent for a new role. */
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(60, "Use 60 characters or fewer"),
  description: z.string().trim().max(300, "Use 300 characters or fewer"),
  permissions: z
    .array(z.string().regex(/^[a-z_]+\.[a-z_]+\.[a-z_]+$/))
    .max(200),
  requiresMfa: z.boolean(),
})

export const customRoleRefInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid(),
})

export const archiveCustomRoleInput = customRoleRefInput.extend({
  archived: z.boolean(),
})

export const setSchoolMfaRolesInput = z.object({
  school: schoolSlugSchema,
  roles: z.array(z.enum(ROLE_KEYS).exclude(["guardian"])).max(12),
})

// The security log (section 3).

export const readSecurityLogInput = z.object({
  school: schoolSlugSchema,
  cursor: z.string().max(500).optional(),
  userId: z.uuid().optional(),
  failuresOnly: z.boolean().default(false),
})

// My account (section 4).

export const updateNameInput = z.object({ name: personNameSchema })

export const requestPhoneCodeInput = z.object({ phone: typedPhoneSchema })

export const confirmBackupPhoneInput = z.object({
  phone: typedPhoneSchema,
  code: codeSchema,
})

export const confirmPhoneChangeInput = z.object({
  phone: typedPhoneSchema,
  oldCode: codeSchema,
  newCode: codeSchema,
})

export const requestEmailChangeInput = z.object({
  email: z.email("Enter an email address").trim().toLowerCase().max(254),
})

export const confirmEmailChangeInput = z.object({
  userId: z.uuid(),
  token: z.string().min(20).max(100),
})

export const deleteAccountInput = z.object({
  confirm: z.literal(true, "Tick the box to confirm"),
})

// The school changes a number or resets a second step (sections 5 and 6).

export const IDENTITY_CHECK_METHODS = ["in_person", "video_call"] as const
export const IDENTITY_EVIDENCE = [
  "parent_id",
  "child_details",
  "staff_id",
  "other",
] as const
export const CONTACT_CHANGE_REASONS = [
  "sim_lost",
  "number_changed",
  "authenticator_lost",
  "other",
] as const

const identityCheck = {
  school: schoolSlugSchema,
  membershipId: z.uuid(),
  checkMethod: z.enum(IDENTITY_CHECK_METHODS),
  evidence: z.enum(IDENTITY_EVIDENCE),
  reason: z.enum(CONTACT_CHANGE_REASONS),
  note: z.string().trim().max(300, "Use 300 characters or fewer").default(""),
}

export const startNumberChangeInput = z.object({
  ...identityCheck,
  phone: typedPhoneSchema,
})

export const confirmNumberChangeInput = z.object({
  school: schoolSlugSchema,
  changeId: z.uuid(),
  phone: typedPhoneSchema,
  code: codeSchema,
})

export const resetMemberMfaInput = z.object(identityCheck)
