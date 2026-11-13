// Feature flags per school (spec: stage-1-time-audit-flags.md, section 3). Off unless
// Akoso has turned the flag on for the school. Cached for a minute per instance.
import { withTenant, sql } from "@akoso/db"
import { FLAGS, type FlagKey } from "@akoso/schemas/flags"

import type { RequestContext } from "../kernel/index"

const TTL_MS = 60_000
const cache = new Map<
  string,
  { overrides: Map<string, boolean>; expires: number }
>()

/** Whether a feature is on for the request's school. No school: the flag's default. */
export async function isEnabled(
  ctx: RequestContext,
  flag: FlagKey,
  now: () => number = Date.now
): Promise<boolean> {
  const fallback = FLAGS[flag].default
  if (ctx.tenantId === null) return fallback
  let entry = cache.get(ctx.tenantId)
  if (entry === undefined || entry.expires <= now()) {
    const rows = await withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx.execute(
        sql`select flag_key, enabled from platform.tenant_feature_flags`
      )
    )
    entry = {
      overrides: new Map(
        rows.rows.map((row) => [String(row.flag_key), row.enabled === true])
      ),
      expires: now() + TTL_MS,
    }
    cache.set(ctx.tenantId, entry)
  }
  return entry.overrides.get(flag) ?? fallback
}

/** Forgets cached flags. For tests, and after a change on this instance. */
export function clearFlagCache(): void {
  cache.clear()
}
