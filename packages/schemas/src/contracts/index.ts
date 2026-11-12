// Every /api/v1 endpoint, by name. The OpenAPI document and the typed client are built
// from this list, and tests check every entry. Add each new contract here.
import type { ActionKey } from "../api"
import { getHealth } from "./system"

export const CONTRACTS = {
  getHealth,
} as const

export type ContractName = keyof typeof CONTRACTS

/**
 * Every permission key in use, mirroring docs/permissions.md. A contract may name only
 * a key listed here; a test fails otherwise. Each slice adds its keys in its spec, for
 * the founder's approval. Empty until sign-in and roles (Stage 1, item 5).
 */
export const KNOWN_ACTIONS: ReadonlySet<ActionKey> = new Set<ActionKey>([])
