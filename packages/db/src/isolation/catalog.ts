// Reads the database's own catalog to find every tenant table and every way one could
// leak (spec: stage-1-tenancy.md, section 5). Nothing here is a hand-kept list, so a
// new table cannot be forgotten.
import { sql } from "drizzle-orm"

import type { Database } from "../client"

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
      -- Application schemas; spike-only tables are skipped by name.
      and n.nspname in ('public', 'platform')
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

  const indexes = await db.execute(sql`
    select ic.relname as name, i.indkey[0]::int as first_column
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = ${table.oid} and i.indnatts > 1`)
  for (const index of indexes.rows) {
    if (Number(index.first_column) !== table.tenantColumn) {
      problems.push(
        `multi-column index ${String(index.name)} does not start with tenant_id`
      )
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
