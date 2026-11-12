import type { RoleKey } from "@akoso/schemas/permissions"

/** Role names as schools say them. */
const ROLE_NAMES: Record<RoleKey, string> = {
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

export const describeRoles = (roles: readonly RoleKey[]): string =>
  roles.map((role) => ROLE_NAMES[role]).join(", ")
