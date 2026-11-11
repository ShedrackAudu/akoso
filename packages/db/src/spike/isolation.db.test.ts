// Spike 01: can one school ever read or change another school's rows?
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, type DatabaseHandle } from "../client"
import { asTenant, errorText, expectDatabaseError } from "./helpers"
import {
  CONNECTIONS,
  TENANT_A,
  TENANT_B,
  TENANT_TABLE_FIXTURES,
  createSpikeSchema,
  dropSpikeSchema,
} from "./setup"

const TENANT_TABLES = Object.keys(TENANT_TABLE_FIXTURES)
const RLS_VIOLATION = /row-level security/i

let app: DatabaseHandle

beforeAll(async () => {
  await createSpikeSchema()
  app = createDatabase(CONNECTIONS.app, 4)
})

afterAll(async () => {
  await app.close()
  await dropSpikeSchema()
})

describe("the catalogue", () => {
  it("has row-level security enabled and forced, with one all-command policy using and checking the tenant, on every tenant table", async () => {
    const owner = new Client({ connectionString: CONNECTIONS.owner })
    await owner.connect()
    try {
      const { rows } = await owner.query<{
        table_name: string
        rls_enabled: boolean
        rls_forced: boolean
        has_tenant_id: boolean
        owner: string
        tenant_policies: number
      }>(`
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls_enabled,
               c.relforcerowsecurity AS rls_forced,
               EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
                       AND a.attname = 'tenant_id' AND NOT a.attisdropped) AS has_tenant_id,
               pg_get_userbyid(c.relowner) AS owner,
               (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid
                  AND p.polcmd = '*'
                  AND pg_get_expr(p.polqual, p.polrelid) LIKE '%app.tenant_id%'
                  AND pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%app.tenant_id%')
                 AS tenant_policies
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY 1`)

      // Every ordinary table in the tenant schema is a tenant table. Platform tables
      // live in the "platform" schema instead.
      expect(rows.length).toBeGreaterThan(0)
      for (const table of rows) {
        expect(table, table.table_name).toMatchObject({
          has_tenant_id: true,
          rls_enabled: true,
          rls_forced: true,
          owner: "akoso_migrator",
        })
        expect(table.tenant_policies, table.table_name).toBeGreaterThanOrEqual(
          1
        )
      }

      // Every tenant table has a fixture, so the cross-school tests below cover it.
      expect(rows.map((t) => t.table_name).sort()).toEqual(
        [...TENANT_TABLES].sort()
      )
    } finally {
      await owner.end()
    }
  })
})

describe.each(TENANT_TABLES)("%s, as school A", (table) => {
  const fixture = TENANT_TABLE_FIXTURES[table]
  if (fixture === undefined) {
    throw new Error(`no fixture for ${table}`)
  }

  it("reads only school A's rows", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_A,
      `SELECT DISTINCT tenant_id::text AS tenant_id FROM public.${table}`
    )
    expect(rows).toEqual([{ tenant_id: TENANT_A }])
  })

  it("finds nothing when it asks for school B's rows by name", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_A,
      `SELECT count(*)::int AS n FROM public.${table} WHERE tenant_id = '${TENANT_B}'`
    )
    expect(rows).toEqual([{ n: 0 }])
  })

  it("cannot insert a row stamped with school B", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        `INSERT INTO public.${table} (tenant_id, ${fixture.insertColumns})
         VALUES ('${TENANT_B}', ${fixture.insertValues})`
      ),
      RLS_VIOLATION
    )
  })

  it("changes none of school B's rows when it tries to update them", async () => {
    const attempt = asTenant(
      app.db,
      TENANT_A,
      `UPDATE public.${table} SET ${fixture.updateSet} WHERE tenant_id = '${TENANT_B}'`
    ).then(
      (result) => `updated ${String(result.rowCount)}`,
      (error: unknown) => errorText(error)
    )
    // Either the row is invisible (0 rows) or the table refuses updates altogether.
    expect(await attempt).toMatch(/^updated 0$|permission denied/)
  })

  it("deletes none of school B's rows when it tries to", async () => {
    const attempt = asTenant(
      app.db,
      TENANT_A,
      `DELETE FROM public.${table} WHERE tenant_id = '${TENANT_B}'`
    ).then(
      (result) => `deleted ${String(result.rowCount)}`,
      (error: unknown) => errorText(error)
    )
    expect(await attempt).toMatch(/^deleted 0$|permission denied/)
  })
})

describe("spike_students, beyond reads and writes", () => {
  it("cannot move its own row to school B", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        `UPDATE public.spike_students SET tenant_id = '${TENANT_B}'`
      ),
      RLS_VIOLATION
    )
  })

  it("can still update its own rows", async () => {
    const { rowCount } = await asTenant(
      app.db,
      TENANT_A,
      `UPDATE public.spike_students SET full_name = full_name WHERE tenant_id = '${TENANT_A}'`
    )
    expect(rowCount).toBe(3)
  })

  it("leaves school B's rows untouched after all the attempts above", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_B,
      `SELECT full_name FROM public.spike_students ORDER BY full_name`
    )
    expect(rows).toEqual([
      { full_name: "Emeka Test" },
      { full_name: "Funke Test" },
    ])
  })
})

describe("with no school set", () => {
  it.each(TENANT_TABLES)(
    "%s returns no rows, without an error",
    async (table) => {
      // Straight through the pool, outside withTenant(): what a mistake would do.
      const { rows } = await app.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM public.${table}`
      )
      expect(rows).toEqual([{ n: 0 }])
    }
  )

  it("cannot insert anything", async () => {
    await expectDatabaseError(
      app.pool.query(
        `INSERT INTO public.spike_students (tenant_id, full_name) VALUES ('${TENANT_A}', 'Nobody')`
      ),
      RLS_VIOLATION
    )
  })
})

describe("routes around row-level security, as the app role", () => {
  it("cannot switch to the table owner's role", async () => {
    await expectDatabaseError(
      asTenant(app.db, TENANT_A, "SET ROLE akoso_migrator"),
      /permission denied to set role/i
    )
  })

  it("cannot turn row-level security off on a table", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        "ALTER TABLE public.spike_students DISABLE ROW LEVEL SECURITY"
      ),
      /must be owner/i
    )
  })

  it("cannot read past the policy by turning row_security off", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        "SET LOCAL row_security = off; SELECT count(*) FROM public.spike_students"
      ),
      /would be affected by row-level security policy/i
    )
  })

  it("sees only its own school through a view owned by the table owner", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_A,
      `SELECT DISTINCT tenant_id::text AS tenant_id FROM public.spike_students_view`
    )
    expect(rows).toEqual([{ tenant_id: TENANT_A }])
  })

  it("cannot create its own objects in the tenant schema", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        "CREATE FUNCTION public.spike_peek() RETURNS bigint LANGUAGE sql SECURITY DEFINER AS 'SELECT count(*) FROM public.spike_students'"
      ),
      /permission denied for schema public/i
    )
  })

  it("cannot read the platform reader's live cross-school view", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        "SELECT * FROM platform.spike_student_counts_live"
      ),
      /permission denied/i
    )
  })
})

describe("append-only tables", () => {
  it("lets a school add a payment", async () => {
    const { rowCount } = await asTenant(
      app.db,
      TENANT_A,
      `INSERT INTO public.spike_payments (tenant_id, amount_kobo) VALUES ('${TENANT_A}', 1500000)`
    )
    expect(rowCount).toBe(1)
  })

  it("refuses to edit even the school's own payment", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        "UPDATE public.spike_payments SET amount_kobo = 1"
      ),
      /permission denied for table spike_payments/i
    )
  })

  it("refuses to delete even the school's own payment", async () => {
    await expectDatabaseError(
      asTenant(app.db, TENANT_A, "DELETE FROM public.spike_payments"),
      /permission denied for table spike_payments/i
    )
  })
})

describe("the table owner, because row-level security is forced", () => {
  it("sees no rows with no school set", async () => {
    const migrator = new Client({ connectionString: CONNECTIONS.migrator })
    await migrator.connect()
    try {
      const { rows } = await migrator.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM public.spike_students"
      )
      expect(rows).toEqual([{ n: 0 }])
    } finally {
      await migrator.end()
    }
  })

  it("sees only the school it sets", async () => {
    const migrator = new Client({ connectionString: CONNECTIONS.migrator })
    await migrator.connect()
    try {
      await migrator.query("BEGIN")
      await migrator.query("SELECT set_config('app.tenant_id', $1, true)", [
        TENANT_B,
      ])
      const { rows } = await migrator.query<{ tenant_id: string }>(
        "SELECT DISTINCT tenant_id::text AS tenant_id FROM public.spike_students"
      )
      await migrator.query("COMMIT")
      expect(rows).toEqual([{ tenant_id: TENANT_B }])
    } finally {
      await migrator.end()
    }
  })
})
