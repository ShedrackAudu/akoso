// How to make one valid row for a given school, for every tenant table (spec:
// stage-1-tenancy.md, section 5). The isolation suite finds tenant tables by reading
// the database, then fails for any table missing here. Add an entry in the same pull
// request as the table's migration.
import { sql, type SQL } from "drizzle-orm"

/**
 * @param tenantId The school the row belongs to.
 * @param marker A unique lower-case token (letters, digits, hyphens) to keep rows apart.
 */
export type IsolationFixture = (tenantId: string, marker: string) => SQL

export const ISOLATION_FIXTURES: Record<string, IsolationFixture> = {
  "platform.idempotency_keys": (tenantId, marker) => sql`
    insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
    values (${tenantId}, 'isolation', ${marker}, 'hash', 'done')`,

  "platform.tenant_domains": (tenantId, marker) => sql`
    insert into platform.tenant_domains (tenant_id, hostname, status)
    values (${tenantId}, ${`${marker}.isolation.example`}, 'pending_dns')`,
}
