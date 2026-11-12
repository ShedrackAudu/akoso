// A small in-memory cache for school lookups, per web instance (spec section 4). Most
// requests then need no database call. Entries live 60 seconds, so a status change
// reaches every instance within a minute; misses live 15 seconds, so a flood of
// made-up addresses costs one lookup each, not one per request.
import type { SchoolSummary } from "@akoso/schemas/tenancy"

export interface SchoolCacheOptions {
  hitTtlMs?: number
  missTtlMs?: number
  maxEntries?: number
  now?: () => number
}

export interface SchoolCache {
  get(
    key: string,
    load: () => Promise<SchoolSummary | null>
  ): Promise<SchoolSummary | null>
  /** Forgets every entry, e.g. after a school's status changes on this instance. */
  clear(): void
}

export function createSchoolCache(
  options: SchoolCacheOptions = {}
): SchoolCache {
  const hitTtl = options.hitTtlMs ?? 60_000
  const missTtl = options.missTtlMs ?? 15_000
  const max = options.maxEntries ?? 2_000
  const now = options.now ?? Date.now
  const entries = new Map<
    string,
    { value: SchoolSummary | null; expires: number }
  >()

  return {
    async get(key, load) {
      const entry = entries.get(key)
      if (entry !== undefined && entry.expires > now()) return entry.value
      const value = await load()
      if (entries.size >= max) {
        // Drop the oldest entry (Maps keep insertion order).
        const oldest = entries.keys().next()
        if (oldest.done !== true) entries.delete(oldest.value)
      }
      entries.delete(key)
      entries.set(key, {
        value,
        expires: now() + (value === null ? missTtl : hitTtl),
      })
      return value
    },
    clear() {
      entries.clear()
    },
  }
}
