import { ROLE_LABELS, type RoleKey } from "@akoso/schemas/permissions"

export const roleName = (role: RoleKey): string => ROLE_LABELS[role]

export const describeRoles = (roles: readonly RoleKey[]): string =>
  roles.map(roleName).join(", ")
