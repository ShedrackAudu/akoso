// The signed-in person and their schools (spec: docs/specs/stage-1-sign-in.md, section 6).
import { z } from "zod"

import { defineContract } from "../api"
import { ROLE_KEYS } from "../permissions"
import { schoolStatusSchema } from "../tenancy"

/** Who is signed in. No phone number or email: a later contract asks for those. */
export const getMe = defineContract({
  method: "GET",
  path: "/api/v1/me",
  summary: "The signed-in person",
  permission: "identity.profile.read",
  rateLimit: "standard",
  input: z.object({}),
  output: z.object({
    id: z.uuid(),
    name: z.string(),
    mfaEnabled: z.boolean(),
  }),
})

export const mySchoolSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  status: schoolStatusSchema,
  roles: z.array(z.enum(ROLE_KEYS)),
})
export type MySchool = z.infer<typeof mySchoolSchema>

/**
 * The schools the signed-in person may use, with their roles in each: the school
 * picker. One page always holds them all (a person is never in more than a handful of
 * schools), so nextCursor is always null.
 */
export const listMySchools = defineContract({
  method: "GET",
  path: "/api/v1/me/schools",
  summary: "The signed-in person's schools and roles",
  permission: "identity.membership.list_own",
  rateLimit: "standard",
  input: z.object({}),
  output: z.object({
    data: z.array(mySchoolSchema),
    nextCursor: z.null(),
  }),
})
