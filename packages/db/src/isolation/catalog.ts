// Reads the database's own catalog to find every tenant table and every way one could
// leak (spec: stage-1-tenancy.md, section 5). Nothing here is a hand-kept list, so a
// new table cannot be forgotten.
import { sql } from "drizzle-orm"

import type { Database } from "../client"

/**
 * Unique rules on tenant tables that are meant to hold across every school. Each needs
 * a reason; anything not listed must start with tenant_id.
 */
const GLOBALLY_UNIQUE: Record<string, readonly string[]> = {
  // A hostname can point at only one school, anywhere on the platform.
  "platform.tenant_domains": ["tenant_domains_hostname_unique"],
}

export interface TenantTable {
  /** "schema.table" */
  name: string
  oid: number
  tenantColumn: number
}

export async function findTenantTables(db: Database): Promise<TenantTable[]> {
  const result = await db.execute(sql`
    select n.nspname || '.' || c.relname as name, c.oid::int as oid, a.attnum::int as column
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where a.attname = 'tenant_id' and not a.attisdropped
      and c.relkind in ('r', 'p')
      -- Every schema but Postgres's own, so a module's new schema is never missed.
      -- Spike-only tables and schemas are skipped by name; they never reach a migration.
      and n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg\\_%'
      and n.nspname not like 'spike\\_%'
      and c.relname not like 'spike\\_%'
    order by 1`)
  return result.rows.map((row) => ({
    name: String(row.name),
    oid: Number(row.oid),
    tenantColumn: Number(row.column),
  }))
}

/** Everything wrong with one tenant table's protection, as plain sentences. */
export async function findTableProblems(
  db: Database,
  table: TenantTable
): Promise<string[]> {
  const problems: string[] = []

  const rls = await db.execute(sql`
    select relrowsecurity as enabled, relforcerowsecurity as forced
    from pg_class where oid = ${table.oid}`)
  if (rls.rows[0]?.enabled !== true) problems.push("RLS is not enabled")
  if (rls.rows[0]?.forced !== true) problems.push("RLS is not forced")

  // A policy for the app role (or everyone) covering every command, whose USING and
  // WITH CHECK both compare tenant_id with the transaction's school.
  const policies = await db.execute(sql`
    select pg_get_expr(polqual, polrelid) as qual,
           pg_get_expr(polwithcheck, polrelid) as check_expr
    from pg_policy
    where polrelid = ${table.oid} and polcmd = '*'
      and (0 = any(polroles) or 'akoso_app'::regrole = any(polroles))`)
  const isTenantMatch = (expression: unknown) =>
    typeof expression === "string" &&
    expression.includes("tenant_id") &&
    expression.includes("app.tenant_id")
  const guarded = policies.rows.some(
    (row) => isTenantMatch(row.qual) && isTenantMatch(row.check_expr)
  )
  if (!guarded) {
    problems.push(
      "no policy for the app role with both USING and WITH CHECK on tenant_id"
    )
  }

  // Every multi-column index, and every unique rule other than the single-column
  // primary key, must start with tenant_id. A unique rule on a business key alone
  // (say, admission number) would let one school block another from using the same
  // value.
  const indexes = await db.execute(sql`
    select ic.relname as name, i.indkey[0]::int as first_column, i.indnatts as width,
           i.indisunique as is_unique, i.indisprimary as is_primary
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = ${table.oid}`)
  for (const index of indexes.rows) {
    const name = String(index.name)
    const startsWithTenant = Number(index.first_column) === table.tenantColumn
    const width = Number(index.width)
    if (startsWithTenant) continue
    if (index.is_unique === true) {
      const rowId = index.is_primary === true && width === 1
      const allowed = GLOBALLY_UNIQUE[table.name]?.includes(name) === true
      if (!rowId && !allowed) {
        problems.push(`unique rule ${name} does not start with tenant_id`)
      }
    } else if (width > 1) {
      problems.push(`multi-column index ${name} does not start with tenant_id`)
    }
  }

  const foreignKey = await db.execute(sql`
    select 1 from pg_constraint
    where conrelid = ${table.oid} and contype = 'f'
      and conkey = array[${table.tenantColumn}]::int2[]
      and confrelid = 'platform.tenants'::regclass`)
  if (foreignKey.rows.length === 0) {
    problems.push("tenant_id does not reference platform.tenants")
  }

  return problems
}
