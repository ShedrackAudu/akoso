// What a signed-in person may use, worked out from their memberships (spec sections 3
// to 5): their schools and roles, whether they must use a second step, and how long
// their sessions may last.
import { sql, type Database } from "@akoso/db"
import {
  isStaffRole,
  MFA_REQUIRED_ROLES,
  ROLE_KEYS,
  type RoleKey,
} from "@akoso/schemas/permissions"
import type { SchoolSummary } from "@akoso/schemas/tenancy"
import { schoolSummarySchema } from "@akoso/schemas/tenancy"

export interface SchoolMembership {
  school: SchoolSummary
  roles: RoleKey[]
}

export interface PersonAccess {
  schools: SchoolMembership[]
  /** Every role the person holds in any school. */
  roles: ReadonlySet<RoleKey>
  /** A role somewhere requires a second step at sign-in. */
  mfaRequired: boolean
  /** The longest a session may last from sign-in, or null for "until it expires". */
  maxSessionSeconds: number | null
  /** Signed out after this long without activity, or null for no idle limit. */
  idleSeconds: number | null
}

const HOUR = 60 * 60
const DAY = 24 * HOUR

const isRole = (value: string): value is RoleKey =>
  (ROLE_KEYS as readonly string[]).includes(value)

/** Session lengths by the most demanding role held (spec section 4; D-25). */
function sessionRules(
  roles: ReadonlySet<RoleKey>
): Pick<PersonAccess, "maxSessionSeconds" | "idleSeconds"> {
  if ([...roles].some((role) => MFA_REQUIRED_ROLES.has(role))) {
    return { maxSessionSeconds: 12 * HOUR, idleSeconds: 2 * HOUR }
  }
  if ([...roles].some(isStaffRole)) {
    return { maxSessionSeconds: 7 * DAY, idleSeconds: 12 * HOUR }
  }
  // Parents: Better Auth's own 30-day expiry, renewed while in use.
  return { maxSessionSeconds: null, idleSeconds: null }
}

/** A person's active memberships in schools that are not closed, and what follows. */
export async function accessFor(
  db: Database,
  userId: string
): Promise<PersonAccess> {
  const result = await db.execute(
    sql`select * from platform.schools_for_user(${userId})`
  )
  const schools: SchoolMembership[] = result.rows.map((row) => ({
    school: schoolSummarySchema.parse({
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      timeZone: row.time_zone,
    }),
    roles: (row.roles as string[]).filter(isRole),
  }))
  const roles = new Set(schools.flatMap((membership) => membership.roles))
  return {
    schools,
    roles,
    mfaRequired: [...roles].some((role) => MFA_REQUIRED_ROLES.has(role)),
    ...sessionRules(roles),
  }
}
