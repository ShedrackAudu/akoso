// A small in-memory cache for school lookups, per web instance (spec: stage-1-tenancy.md,
// section 4). Most requests then need no database call. Hardened after two cross-model
// reviews (PR #16 finding 3, PR #17 finding 1), so a flood of made-up addresses can
// neither push real schools out, pile up database queries, nor make a real school
// look as if it does not exist:
//
// - Found schools and misses live in separate stores, each capped, so misses can never
//   evict a real school.
// - Found schools are fresh for 60 seconds (a status change reaches every instance
//   within a minute); misses for 15 seconds.
// - Identical lookups in flight at the same moment share one database query.
// - Database lookups not answered from memory are budgeted per second. Over budget, a
//   school seen in the last 10 minutes is served from its last known details, and
//   anything else gets SchoolLookupBusyError, never "not found", so the caller can say
//   "try again shortly" (503) instead of 404.
// - If the database fails, the last known details are served the same way.
import type { SchoolSummary } from "@akoso/schemas/tenancy"

/** The lookup budget is spent and nothing is known about this key: try again shortly. */
export class SchoolLookupBusyError extends Error {
  constructor() {
    super("School lookups are over budget; try again shortly")
    this.name = "SchoolLookupBusyError"
  }
}

export interface SchoolCacheOptions {
  hitTtlMs?: number
  missTtlMs?: number
  /** How long an expired school may still be served when the database can't be asked. */
  staleTtlMs?: number
  /** Most found schools kept. */
  maxHits?: number
  /** Most misses kept. */
  maxMisses?: number
  /** Most database lookups started per second. */
  maxLoadsPerSecond?: number
  now?: () => number
}

export interface SchoolCache {
  /**
   * @throws SchoolLookupBusyError when over budget with nothing known about the key.
   */
  get(
    key: string,
    load: () => Promise<SchoolSummary | null>
  ): Promise<SchoolSummary | null>
  /** Forgets every entry, e.g. after a school's status changes on this instance. */
  clear(): void
}

interface Entry<Value> {
  value: Value
  /** Fresh until this time. */
  freshUntil: number
  /** Kept, as a fallback, until this time. */
  keepUntil: number
}

/** A capped map that drops its oldest entry when a new key would overflow it. */
function boundedStore<Value>(max: number) {
  const entries = new Map<string, Entry<Value>>()
  return {
    read(key: string, now: number): Entry<Value> | undefined {
      const entry = entries.get(key)
      if (entry === undefined) return undefined
      if (entry.keepUntil <= now) {
        entries.delete(key)
        return undefined
      }
      return entry
    },
    write(key: string, entry: Entry<Value>): void {
      // Only a new key can overflow the store (PR #16 finding 7).
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
  const staleTtl = options.staleTtlMs ?? 10 * 60_000
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
      if (hit !== undefined && hit.freshUntil > at) return hit.value
      const miss = misses.read(key, at)
      if (miss !== undefined && miss.freshUntil > at) return null

      const pending = inFlight.get(key)
      if (pending !== undefined) return pending
      if (!withinBudget()) {
        if (hit !== undefined) return hit.value
        throw new SchoolLookupBusyError()
      }

      const lookup = (async () => {
        try {
          const value = await load()
          const loadedAt = now()
          if (value === null) {
            hits.remove(key)
            misses.write(key, {
              value: null,
              freshUntil: loadedAt + missTtl,
              keepUntil: loadedAt + missTtl,
            })
          } else {
            misses.remove(key)
            hits.write(key, {
              value,
              freshUntil: loadedAt + hitTtl,
              keepUntil: loadedAt + hitTtl + staleTtl,
            })
          }
          return value
        } catch (error) {
          // The database failed: the last known details beat an error page.
          if (hit !== undefined) return hit.value
          throw error
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
