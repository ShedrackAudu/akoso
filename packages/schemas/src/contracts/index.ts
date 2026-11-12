// Every /api/v1 endpoint, by name. The OpenAPI document and the typed client are built
// from this list, and tests check every entry. Add each new contract here.
import type { ActionKey } from "../api"
import { ROLE_PERMISSIONS } from "../permissions"
import { getMe, listMySchools } from "./identity"
import { getHealth } from "./system"

export const CONTRACTS = {
  getHealth,
  getMe,
  listMySchools,
} as const

export type ContractName = keyof typeof CONTRACTS

/**
 * Every permission key in use: those some role grants (packages/schemas/src/
 * permissions.ts, mirroring docs/permissions.md). A contract may name only a key
 * listed here; a test fails otherwise.
 */
export const KNOWN_ACTIONS: ReadonlySet<ActionKey> = new Set<ActionKey>(
  Object.values(ROLE_PERMISSIONS).flat()
)
