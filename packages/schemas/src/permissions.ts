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

/** Roles whose holders must use a second step at sign-in (brief section 6). */
export const MFA_REQUIRED_ROLES: ReadonlySet<RoleKey> = new Set([
  "proprietor",
  "school_admin",
  "bursar",
])

/** Every role except guardian works for the school. */
export const isStaffRole = (role: RoleKey): boolean => role !== "guardian"

const EVERY_ROLE: readonly ActionKey[] = [
  "identity.profile.read",
  "identity.membership.list_own",
]

/** What each role may do. Stage 1 item 5 adds only what every role needs. */
/** Reading a school's audit log (D-27): its page comes later; the right exists now. */
const AUDIT_READERS: ReadonlySet<RoleKey> = new Set([
  "proprietor",
  "school_admin",
])

export const ROLE_PERMISSIONS: Readonly<Record<RoleKey, readonly ActionKey[]>> =
  Object.fromEntries(
    ROLE_KEYS.map((role) => [
      role,
      AUDIT_READERS.has(role)
        ? [...EVERY_ROLE, "audit.event.read"]
        : EVERY_ROLE,
    ])
  ) as Record<RoleKey, readonly ActionKey[]>

/** The permissions a set of roles grants together. */
export function permissionsFor(roles: Iterable<RoleKey>): Set<ActionKey> {
  const granted = new Set<ActionKey>()
  for (const role of roles) {
    for (const action of ROLE_PERMISSIONS[role]) granted.add(action)
  }
  return granted
}
