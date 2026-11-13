// Roles and what each may do, mirroring docs/permissions.md (brief section 6). The
// server turns a person's roles in a school into permissions with this table; tests
// check it against the document. Each slice adds its actions here, in its spec, for
// the founder's approval.
import type { ActionKey } from "./api"

/** School roles, as named in docs/permissions.md. Students are Part 2. */
export const ROLE_KEYS = [
  "group_owner",
  "proprietor",
  "school_admin",
  "bursar",
  "head_teacher",
  "vice_principal",
  "safeguarding_lead",
  "nurse",
  "accountant",
  "teacher",
  "gate_staff",
  "guardian",
] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export const isRoleKey = (value: string): value is RoleKey =>
  (ROLE_KEYS as readonly string[]).includes(value)

/** Roles whose holders must always use a second step at sign-in (brief section 6). */
export const MFA_REQUIRED_ROLES: ReadonlySet<RoleKey> = new Set([
  "proprietor",
  "school_admin",
  "bursar",
])

/** Every role except guardian works for the school. */
export const isStaffRole = (role: RoleKey): boolean => role !== "guardian"

/** Roles only a proprietor may grant or remove (part B spec, section 1, rule 2). */
export const PROPRIETOR_GRANTED_ROLES: ReadonlySet<RoleKey> = new Set([
  "proprietor",
  "school_admin",
])

/** Roles listed in the access review (brief 28; part B spec, section 3). */
export const ELEVATED_ROLES: ReadonlySet<RoleKey> = new Set([
  "group_owner",
  "proprietor",
  "school_admin",
  "bursar",
  "safeguarding_lead",
  "nurse",
  "accountant",
])

const EVERY_ROLE: readonly ActionKey[] = [
  "identity.profile.read",
  "identity.profile.update",
  "identity.membership.list_own",
]

/** Proprietor and school administrator (part B spec, Permissions). */
const SCHOOL_MANAGERS: readonly ActionKey[] = [
  // Reading a school's audit log (D-27): its page comes later; the right exists now.
  "audit.event.read",
  "identity.member.read",
  "identity.member.manage",
  "identity.role.manage",
  "identity.contact.change",
  "identity.mfa.reset",
]

/** The proprietor alone (brief 6: the security log; part B spec, Permissions). */
const PROPRIETOR_ONLY: readonly ActionKey[] = [
  "identity.role.approve_restricted",
  "identity.security_log.read",
  "identity.access_review.read",
]

export const ROLE_PERMISSIONS: Readonly<Record<RoleKey, readonly ActionKey[]>> =
  Object.fromEntries(
    ROLE_KEYS.map((role) => {
      if (role === "proprietor") {
        return [role, [...EVERY_ROLE, ...SCHOOL_MANAGERS, ...PROPRIETOR_ONLY]]
      }
      if (role === "school_admin") {
        return [role, [...EVERY_ROLE, ...SCHOOL_MANAGERS]]
      }
      return [role, EVERY_ROLE]
    })
  ) as Record<RoleKey, readonly ActionKey[]>

/**
 * Permissions that stay with named roles and go into a custom role only with the
 * proprietor's approval (brief 6): health records, restricted notes, custody
 * restrictions, payroll and settlement-account changes. Each arrives with its feature,
 * already listed here.
 */
export const RESTRICTED_ACTIONS: ReadonlySet<ActionKey> = new Set<ActionKey>([])

/** Permissions that can never go into a custom role (part B spec, section 2). */
export const NEVER_IN_CUSTOM_ROLES: ReadonlySet<ActionKey> = new Set<ActionKey>(
  [
    "identity.role.approve_restricted",
    // Akoso team actions (section 8) never reach a school.
    "team.member.read",
    "team.member.manage",
    "team.security_log.read",
  ]
)

/** Permissions a school may put into a custom role: every school action but these. */
export const CUSTOM_ROLE_ACTIONS: readonly ActionKey[] = [
  ...new Set(Object.values(ROLE_PERMISSIONS).flat()),
]
  .filter((action) => !NEVER_IN_CUSTOM_ROLES.has(action))
  .sort()

/** The permissions a set of roles grants together, plus any from custom roles. */
export function permissionsFor(
  roles: Iterable<RoleKey>,
  customPermissions: Iterable<string> = []
): Set<ActionKey> {
  const granted = new Set<ActionKey>()
  for (const role of roles) {
    for (const action of ROLE_PERMISSIONS[role]) granted.add(action)
  }
  const allowed = new Set<string>(CUSTOM_ROLE_ACTIONS)
  for (const action of customPermissions) {
    // A stored permission that no longer exists, or may never be in a custom role,
    // grants nothing.
    if (allowed.has(action) || RESTRICTED_ACTIONS.has(action as ActionKey)) {
      granted.add(action as ActionKey)
    }
  }
  return granted
}

/** Role names as schools say them. A custom role may not reuse one. */
export const ROLE_LABELS: Readonly<Record<RoleKey, string>> = {
  group_owner: "Group owner",
  proprietor: "Proprietor",
  school_admin: "School administrator",
  bursar: "Bursar",
  head_teacher: "Head teacher",
  vice_principal: "Vice principal",
  safeguarding_lead: "Safeguarding lead",
  nurse: "School nurse",
  accountant: "Accountant",
  teacher: "Teacher",
  gate_staff: "Gate staff",
  guardian: "Parent",
}

// Akoso team roles (brief 26.2; sign-in part B, section 8). A separate set of people
// and permissions from schools': none of these can go into a school's custom role.

export const TEAM_ROLE_KEYS = [
  "owner",
  "support",
  "onboarding",
  "finance",
  "sales",
  "ops",
] as const
export type TeamRoleKey = (typeof TEAM_ROLE_KEYS)[number]

export const isTeamRoleKey = (value: string): value is TeamRoleKey =>
  (TEAM_ROLE_KEYS as readonly string[]).includes(value)

export const TEAM_ROLE_LABELS: Readonly<Record<TeamRoleKey, string>> = {
  owner: "Owner",
  support: "Support",
  onboarding: "Onboarding",
  finance: "Finance",
  sales: "Sales",
  ops: "Ops and engineering",
}

/**
 * What each team role may do. Only the Owner has team actions yet; the others get theirs
 * with the features that need them (support sessions, the fee ledger).
 */
export const TEAM_ROLE_PERMISSIONS: Readonly<
  Record<TeamRoleKey, readonly ActionKey[]>
> = {
  owner: ["team.member.read", "team.member.manage", "team.security_log.read"],
  support: [],
  onboarding: [],
  finance: [],
  sales: [],
  ops: [],
}

/** The permissions a set of team roles grants together. */
export function teamPermissionsFor(
  roles: Iterable<TeamRoleKey>
): Set<ActionKey> {
  const granted = new Set<ActionKey>()
  for (const role of roles) {
    for (const action of TEAM_ROLE_PERMISSIONS[role]) granted.add(action)
  }
  return granted
}
