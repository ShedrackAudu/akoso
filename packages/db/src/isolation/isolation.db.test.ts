// The tenant-isolation suite (brief section 7; spec stage-1-tenancy.md, section 5).
// For every table with a tenant_id column, found from the database itself, it proves:
// RLS enabled and forced, a USING + WITH CHECK policy, tenant_id first in multi-column
// indexes, a foreign key to platform.tenants, and that school B cannot read, insert,
// update or delete school A's rows. Runs on every pull request (Database tests).
import { randomUUID } from "node:crypto"

import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase } from "../client"
import { withTenant } from "../with-tenant"
import {
  findTableProblems,
  findTenantTables,
  type TenantTable,
} from "./catalog"
import { ISOLATION_FIXTURES, type IsolationFixture } from "./fixtures"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
// Superuser, straight to Postgres: sets up rows for both schools and plants tables.
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"

const SCHOOL_A = "0a000000-0000-4000-8000-00000000000a"
const SCHOOL_B = "0b000000-0000-4000-8000-00000000000b"

const app = createDatabase(APP_URL, 2)
const owner = createDatabase(OWNER_URL, 1)
let tables: TenantTable[] = []

beforeAll(async () => {
  tables = await findTenantTables(owner.db)
})
afterAll(async () => {
  await app.close()
  await owner.close()
})

/** The error text, or "ok" when the work succeeded. */
async function outcome(work: Promise<unknown>): Promise<string> {
  return work.then(
    () => "ok",
    (error: unknown) =>
      error instanceof Error
        ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
        : String(error)
  )
}

/** Rows affected, or 0 when the app role has no grant for that command at all. */
async function affected(
  work: Promise<{ rowCount: number | null }>
): Promise<number> {
  try {
    return (await work).rowCount ?? 0
  } catch (error) {
    const text =
      error instanceof Error
        ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
        : String(error)
    if (/permission denied/.test(text)) return 0
    throw error
  }
}

/**
 * Tries every way school B could reach school A's rows in one table, as the app role
 * through the pooler. Returns what got through; empty when the table is sound.
 */
async function crossSchoolFailures(
  name: string,
  fixture: IsolationFixture
): Promise<string[]> {
  const failures: string[] = []
  const marker = `iso-${randomUUID().slice(0, 8)}`
  await owner.db.execute(fixture(SCHOOL_A, `${marker}-a`))
  await owner.db.execute(fixture(SCHOOL_B, `${marker}-b`))
  const t = sql.raw(name)

  const asB = <T>(work: Parameters<typeof withTenant<T>>[2]) =>
    withTenant(app.db, SCHOOL_B, work)

  const read = await outcome(
    asB(async (tx) => {
      const rows = await tx.execute(
        sql`select 1 from ${t} where tenant_id = ${SCHOOL_A}`
      )
      if (rows.rows.length > 0) throw new Error("LEAK: read school A's rows")
    })
  )
  if (read !== "ok" && !/permission denied/.test(read))
    failures.push(`${name} read: ${read}`)

  const updated = await affected(
    asB((tx) =>
      tx.execute(
        sql`update ${t} set tenant_id = tenant_id where tenant_id = ${SCHOOL_A}`
      )
    )
  )
  if (updated > 0)
    failures.push(`${name}: school B updated ${String(updated)} of A's rows`)

  const deleted = await affected(
    asB((tx) => tx.execute(sql`delete from ${t} where tenant_id = ${SCHOOL_A}`))
  )
  if (deleted > 0)
    failures.push(`${name}: school B deleted ${String(deleted)} of A's rows`)

  const inserted = await outcome(
    asB((tx) => tx.execute(fixture(SCHOOL_A, `${marker}-x`)))
  )
  if (inserted === "ok") failures.push(`${name}: school B inserted a row for A`)

  const countA = async () =>
    Number(
      (
        await owner.db.execute(
          sql`select count(*)::int as n from ${t} where tenant_id = ${SCHOOL_A}`
        )
      ).rows[0]?.n
    )
  const aBefore = await countA()
  await outcome(
    asB((tx) =>
      tx.execute(
        sql`update ${t} set tenant_id = ${SCHOOL_A} where tenant_id = ${SCHOOL_B}`
      )
    )
  )
  if ((await countA()) > aBefore)
    failures.push(`${name}: school B moved a row to A`)

  const unscoped = await outcome(
    (async () => {
      const rows = await app.db.execute(sql`select 1 from ${t} limit 1`)
      if (rows.rows.length > 0)
        throw new Error("LEAK: rows visible with no school set")
    })()
  )
  if (unscoped !== "ok" && !/permission denied/.test(unscoped)) {
    failures.push(`${name} with no school: ${unscoped}`)
  }

  const ownRows = await owner.db.execute(
    sql`select count(*)::int as n from ${t} where tenant_id = ${SCHOOL_A}`
  )
  if (Number(ownRows.rows[0]?.n) < 1)
    failures.push(`${name}: school A's row went missing`)

  await owner.db.execute(
    sql`delete from ${t} where tenant_id in (${SCHOOL_A}, ${SCHOOL_B})`
  )
  return failures
}

describe("tenant isolation", () => {
  it("finds the tenant tables", () => {
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "platform.idempotency_keys",
        "platform.tenant_domains",
      ])
    )
  })

  it("protects every tenant table: forced RLS, policy, indexes, foreign key", async () => {
    const problems: string[] = []
    for (const table of tables) {
      for (const problem of await findTableProblems(owner.db, table)) {
        problems.push(`${table.name}: ${problem}`)
      }
    }
    expect(problems).toEqual([])
  })

  it("has a row fixture for every tenant table", () => {
    const missing = tables
      .map((t) => t.name)
      .filter((name) => !(name in ISOLATION_FIXTURES))
    expect(missing).toEqual([])
  })

  it("keeps every school's rows from every other school", async () => {
    const failures: string[] = []
    for (const table of tables) {
      const fixture = ISOLATION_FIXTURES[table.name]
      if (fixture === undefined) continue
      failures.push(...(await crossSchoolFailures(table.name, fixture)))
    }
    expect(failures).toEqual([])
  })

  it("catches an unprotected table (proof the checks bite)", async () => {
    await owner.db.execute(sql`
      drop table if exists public.isolation_planted;
      create table public.isolation_planted (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null,
        note text,
        created_at timestamptz not null default now()
      );
      create index isolation_planted_created_tenant_idx
        on public.isolation_planted (created_at, tenant_id)`)
    try {
      const planted = (await findTenantTables(owner.db)).find(
        (t) => t.name === "public.isolation_planted"
      )
      expect(planted).toBeDefined()
      const problems = planted ? await findTableProblems(owner.db, planted) : []
      expect(problems).toEqual([
        "RLS is not enabled",
        "RLS is not forced",
        "no policy for the app role with both USING and WITH CHECK on tenant_id",
        "multi-column index isolation_planted_created_tenant_idx does not start with tenant_id",
        "tenant_id does not reference platform.tenants",
      ])
    } finally {
      await owner.db.execute(sql`drop table if exists public.isolation_planted`)
    }
  })

  it("catches a table whose policy lets every school through (proof the behaviour test bites)", async () => {
    await owner.db.execute(sql`
      drop table if exists public.isolation_leaky;
      create table public.isolation_leaky (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references platform.tenants (id),
        note text
      );
      alter table public.isolation_leaky enable row level security;
      alter table public.isolation_leaky force row level security;
      create policy everyone on public.isolation_leaky
        for all to akoso_app using (true) with check (true);
      grant select, insert, update, delete on public.isolation_leaky to akoso_app`)
    try {
      const failures = await crossSchoolFailures(
        "public.isolation_leaky",
        (tenantId, marker) =>
          sql`insert into public.isolation_leaky (tenant_id, note) values (${tenantId}, ${marker})`
      )
      const report = failures.join("\n")
      expect(report).toMatch(/read: .*LEAK/)
      expect(report).toMatch(/updated \d+ of A's rows/)
      expect(report).toMatch(/inserted a row for A/)
      expect(report).toMatch(/moved a row to A/)
      expect(report).toMatch(/with no school: .*LEAK/)
    } finally {
      await owner.db.execute(sql`drop table if exists public.isolation_leaky`)
    }
  })
})
