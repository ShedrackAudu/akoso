// Inputs for Akoso team sign-in and team management (spec:
// docs/specs/stage-1-sign-in-part-b.md, section 8). Shared by the use cases and the
// admin app's screens.
import { z } from "zod"

import { TEAM_ROLE_KEYS } from "./permissions"

const emailSchema = z
  .email("Enter an email address")
  .trim()
  .toLowerCase()
  .max(254)

export const startEnrolmentInput = z.object({
  token: z.string().min(20).max(100),
})

export const startRecoveryInput = z.object({
  email: emailSchema,
  code: z.string().trim().min(8).max(40),
})

export const inviteTeamMemberInput = z.object({
  name: z.string().trim().min(1, "Enter a name").max(200),
  email: emailSchema,
  roles: z.array(z.enum(TEAM_ROLE_KEYS)).min(1, "Choose at least one role"),
  /** The person's email typed again, required when granting the Owner role. */
  confirmEmail: z.string().trim().toLowerCase().max(254).default(""),
})

export const changeTeamRolesInput = z.object({
  userId: z.uuid(),
  roles: z.array(z.enum(TEAM_ROLE_KEYS)).min(1, "Choose at least one role"),
  confirmEmail: z.string().trim().toLowerCase().max(254).default(""),
})

export const removeTeamMemberInput = z.object({
  userId: z.uuid(),
  confirmEmail: z.string().trim().toLowerCase().max(254).default(""),
})

export const deletePasskeyInput = z.object({ id: z.uuid() })

export const readTeamSecurityLogInput = z.object({
  cursor: z.string().max(500).optional(),
})
