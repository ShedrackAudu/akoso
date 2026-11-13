import { ROLE_LABELS, type RoleKey } from "@akoso/schemas/permissions"

/** Role names as schools say them (the labels live in the shared role table). */
export const describeRoles = (roles: readonly RoleKey[]): string =>
  roles.map((role) => ROLE_LABELS[role]).join(", ")
