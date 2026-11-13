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

  // The trigger fills seq, time and hashes.
  "platform.audit_events": (tenantId, marker) => sql`
    insert into platform.audit_events (tenant_id, actor, action, entity_type, entity_id)
    values (${tenantId}, 'system:isolation', 'isolation.test', 'isolation', ${marker})`,

  // One per school, so an existing head is left as it is.
  "platform.audit_chain_heads": (tenantId) => sql`
    insert into platform.audit_chain_heads (tenant_id, last_seq, last_hash)
    values (${tenantId}, 0, repeat('0', 64))
    on conflict (tenant_id) do nothing`,

  "platform.tenant_feature_flags": (tenantId, marker) => sql`
    insert into platform.tenant_feature_flags (tenant_id, flag_key, enabled)
    values (${tenantId}, ${`isolation.${marker.replaceAll("-", "_")}`}, true)`,

  "platform.memberships": (tenantId, marker) => sql`
    with person as (
      insert into platform.users (id, name, email)
      values (gen_random_uuid(), 'Isolation Test Person', ${`${marker}@isolation.invalid`})
      returning id
    )
    insert into platform.memberships (tenant_id, user_id, roles)
    select ${tenantId}, id, array['teacher'] from person`,

  "platform.tenant_domains": (tenantId, marker) => sql`
    insert into platform.tenant_domains (tenant_id, hostname, status)
    values (${tenantId}, ${`${marker}.isolation.example`}, 'pending_dns')`,
}
