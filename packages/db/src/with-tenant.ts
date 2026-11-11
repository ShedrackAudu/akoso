import { sql } from "drizzle-orm"

import type { Database, TenantTransaction } from "./client"

// The canonical lower-case or upper-case 8-4-4-4-12 hex form.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Thrown before any database work when `withTenant()` gets something that is not a tenant ID. */
export class InvalidTenantIdError extends Error {
  constructor() {
    // The value is deliberately left out of the message: it came from a caller we
    // do not trust to have sent a tenant ID at all.
    super("withTenant() needs a tenant ID in UUID form")
    this.name = "InvalidTenantIdError"
  }
}

/**
 * Runs `work` in one transaction scoped to one school. This is the only way
 * application code may reach tenant data (brief section 7).
 *
 * The tenant is set with `set_config('app.tenant_id', id, true)`. The `true` makes
 * the setting last only until the transaction ends, so a pooled connection never
 * carries one school's setting into the next caller's work. Row-level security
 * policies read the setting; with none set, they return no rows.
 *
 * @param db The application role's database, from `createDatabase()`.
 * @param tenantId The school's ID. It must already have been checked against the
 *   signed-in user's memberships; this function does not do that.
 * @param work Everything to do for that school, using the transaction it is given.
 * @returns Whatever `work` returns, after the transaction commits.
 * @throws InvalidTenantIdError when `tenantId` is not a UUID, before any query runs.
 *   Anything `work` throws rolls the transaction back and is rethrown.
 */
export async function withTenant<T>(
  db: Database,
  tenantId: string,
  work: (tx: TenantTransaction) => Promise<T>
): Promise<T> {
  if (!UUID_PATTERN.test(tenantId)) {
    throw new InvalidTenantIdError()
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`)
    return work(tx)
  })
}
