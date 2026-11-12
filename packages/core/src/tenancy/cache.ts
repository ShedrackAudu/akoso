// A small in-memory cache for school lookups, per web instance (spec: stage-1-tenancy.md,
// section 4). Most requests then need no database call. Hardened after the review of
// PR #16 (finding 3), so a flood of made-up addresses cannot push real schools out or
// pile up database queries:
//
// - Found schools and misses live in separate stores, each capped, so misses can never
//   evict a real school.
// - Found schools live 60 seconds (a status change reaches every instance within a
//   minute); misses live 15 seconds.
// - Identical lookups in flight at the same moment share one database query.
// - Database lookups that are not answered from the cache are budgeted per second.
//   Over budget, the answer is "not found" without asking the database; it is not
//   cached, so the next request within budget asks again.
import type { SchoolSummary } from "@akoso/schemas/tenancy"

export interface SchoolCacheOptions {
  hitTtlMs?: number
  missTtlMs?: number
  /** Most found schools kept. */
  maxHits?: number
  /** Most misses kept. */
  maxMisses?: number
  /** Most database lookups started per second; the rest answer "not found". */
  maxLoadsPerSecond?: number
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

interface Entry<Value> {
  value: Value
  expires: number
}

/** A capped map that drops its oldest entry when a new key would overflow it. */
function boundedStore<Value>(max: number) {
  const entries = new Map<string, Entry<Value>>()
  return {
    read(key: string, now: number): Entry<Value> | undefined {
      const entry = entries.get(key)
      if (entry === undefined) return undefined
      if (entry.expires <= now) {
        entries.delete(key)
        return undefined
      }
      return entry
    },
    write(key: string, entry: Entry<Value>): void {
      // Only a new key can overflow the store (review finding 7).
      if (!entries.has(key) && entries.size >= max) {
        const oldest = entries.keys().next()
        if (oldest.done !== true) entries.delete(oldest.value)
      }
      entries.delete(key)
      entries.set(key, entry)
    },
    remove(key: string): void {
      entries.delete(key)
    },
    clear(): void {
      entries.clear()
    },
  }
}

export function createSchoolCache(
  options: SchoolCacheOptions = {}
): SchoolCache {
  const hitTtl = options.hitTtlMs ?? 60_000
  const missTtl = options.missTtlMs ?? 15_000
  const maxLoads = options.maxLoadsPerSecond ?? 50
  const now = options.now ?? Date.now
  const hits = boundedStore<SchoolSummary>(options.maxHits ?? 2_000)
  const misses = boundedStore<null>(options.maxMisses ?? 2_000)
  const inFlight = new Map<string, Promise<SchoolSummary | null>>()
  let budgetSecond = -1
  let budgetUsed = 0

  const withinBudget = (): boolean => {
    const second = Math.floor(now() / 1000)
    if (second !== budgetSecond) {
      budgetSecond = second
      budgetUsed = 0
    }
    if (budgetUsed >= maxLoads) return false
    budgetUsed++
    return true
  }

  return {
    async get(key, load) {
      const at = now()
      const hit = hits.read(key, at)
      if (hit !== undefined) return hit.value
      if (misses.read(key, at) !== undefined) return null

      const pending = inFlight.get(key)
      if (pending !== undefined) return pending
      if (!withinBudget()) return null

      const lookup = (async () => {
        try {
          const value = await load()
          if (value === null) {
            misses.write(key, { value: null, expires: now() + missTtl })
          } else {
            misses.remove(key)
            hits.write(key, { value, expires: now() + hitTtl })
          }
          return value
        } finally {
          inFlight.delete(key)
        }
      })()
      inFlight.set(key, lookup)
      return lookup
    },
    clear() {
      hits.clear()
      misses.clear()
    },
  }
}
