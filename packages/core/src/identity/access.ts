// What a signed-in person may use, worked out from their memberships (sign-in spec
// sections 3 to 5; part B section 2): their schools, roles and custom roles, whether
// they must use a second step, and how long their sessions may last.
import { sql, type Database } from "@akoso/db"
import {
  isRoleKey,
  isStaffRole,
  MFA_REQUIRED_ROLES,
  type RoleKey,
} from "@akoso/schemas/permissions"
import type { SchoolSummary } from "@akoso/schemas/tenancy"
import { schoolSummarySchema } from "@akoso/schemas/tenancy"

export interface SchoolMembership {
  school: SchoolSummary
  membershipId: string
  roles: RoleKey[]
  /** Permissions from the person's custom roles in this school. */
  customPermissions: string[]
  /** The person holds at least one custom role here (so works for the school). */
  hasCustomRole: boolean
  /** This school requires a second step of this person. */
  mfaRequired: boolean
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

const textArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : []

/** Session lengths by the most demanding membership held (spec section 4; D-25). */
function sessionRules(
  schools: readonly SchoolMembership[]
): Pick<PersonAccess, "maxSessionSeconds" | "idleSeconds"> {
  if (schools.some((membership) => membership.mfaRequired)) {
    return { maxSessionSeconds: 12 * HOUR, idleSeconds: 2 * HOUR }
  }
  const works = schools.some(
    (membership) =>
      membership.hasCustomRole || membership.roles.some(isStaffRole)
  )
  if (works) return { maxSessionSeconds: 7 * DAY, idleSeconds: 12 * HOUR }
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
  const schools: SchoolMembership[] = result.rows.map((row) => {
    const roles = textArray(row.roles).filter(isRoleKey)
    const schoolMfaRoles = new Set(textArray(row.school_mfa_roles))
    return {
      school: schoolSummarySchema.parse({
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        timeZone: row.time_zone,
      }),
      membershipId: String(row.membership_id),
      roles,
      customPermissions: textArray(row.custom_permissions),
      hasCustomRole: typeof row.custom_requires_mfa === "boolean",
      mfaRequired:
        row.custom_requires_mfa === true ||
        roles.some(
          (role) =>
            MFA_REQUIRED_ROLES.has(role) ||
            (isStaffRole(role) && schoolMfaRoles.has(role))
        ),
    }
  })
  return {
    schools,
    roles: new Set(schools.flatMap((membership) => membership.roles)),
    mfaRequired: schools.some((membership) => membership.mfaRequired),
    ...sessionRules(schools),
  }
}
