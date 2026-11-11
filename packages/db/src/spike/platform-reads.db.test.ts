// Spike 01, decision D-OPEN-5: how do platform-wide screens (the founder's dashboard,
// the platform-fee ledger) read figures across schools without the app ever bypassing
// row-level security?
import { eq, sql } from "drizzle-orm"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, type DatabaseHandle } from "../client"
import { withTenant } from "../with-tenant"
import { asTenant, expectDatabaseError } from "./helpers"
import {
  CONNECTIONS,
  TENANT_A,
  TENANT_B,
  createSpikeSchema,
  dropSpikeSchema,
} from "./setup"

let app: DatabaseHandle
let reader: Client

beforeAll(async () => {
  await createSpikeSchema()
  app = createDatabase(CONNECTIONS.app, 4)
  reader = new Client({ connectionString: CONNECTIONS.platformReader })
  await reader.connect()
})

afterAll(async () => {
  await reader.end()
  await app.close()
  await dropSpikeSchema()
})

/**
 * Option (a): a job visits each school inside withTenant(), works out the figure under
 * that school's own row-level security, and writes it to a platform table.
 */
async function publishStudentCounts(): Promise<void> {
  const tenants = await app.pool.query<{ id: string }>(
    "select id::text as id from platform.spike_tenants order by id"
  )
  for (const { id } of tenants.rows) {
    await withTenant(app.db, id, async (tx) => {
      await tx.execute(sql`
        insert into platform.spike_student_counts (tenant_id, student_count)
        select ${id}::uuid, count(*)::int from public.spike_students
        on conflict (tenant_id) do update
          set student_count = excluded.student_count, computed_at = now()`)
    })
  }
}

describe("option (a): figures published per school into a platform table", () => {
  it("gives the platform reader every school's figure", async () => {
    await publishStudentCounts()
    const { rows } = await reader.query<{
      tenant_id: string
      student_count: number
    }>(
      "select tenant_id::text, student_count from platform.spike_student_counts order by tenant_id"
    )
    expect(rows).toEqual([
      { tenant_id: TENANT_A, student_count: 3 },
      { tenant_id: TENANT_B, student_count: 2 },
    ])
  })

  it("stops a job running for school A from writing school B's figure", async () => {
    await expectDatabaseError(
      asTenant(
        app.db,
        TENANT_A,
        `insert into platform.spike_student_counts (tenant_id, student_count)
         values ('${TENANT_B}', 999)
         on conflict (tenant_id) do update set student_count = excluded.student_count`
      ),
      /row-level security/i
    )
  })

  it("never lets the platform reader touch school records", async () => {
    await expectDatabaseError(
      reader.query("select * from public.spike_students"),
      /permission denied for table spike_students/i
    )
  })

  it("never lets the platform reader change a published figure", async () => {
    await expectDatabaseError(
      reader.query(
        "update platform.spike_student_counts set student_count = 0"
      ),
      /permission denied/i
    )
  })

  it("keeps the app from reading other schools' published figures", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_A,
      "select tenant_id::text from platform.spike_student_counts"
    )
    expect(rows).toEqual([{ tenant_id: TENANT_A }])
  })
})

describe("option (b): a live cross-school view owned by a role that bypasses RLS", () => {
  it("gives the platform reader live figures for every school", async () => {
    const { rows } = await reader.query<{
      tenant_id: string
      student_count: number
    }>(
      "select tenant_id::text, student_count from platform.spike_student_counts_live order by tenant_id"
    )
    expect(rows).toEqual([
      { tenant_id: TENANT_A, student_count: 3 },
      { tenant_id: TENANT_B, student_count: 2 },
    ])
  })

  it("only works because a BYPASSRLS role exists in the database", async () => {
    const owner = new Client({ connectionString: CONNECTIONS.owner })
    await owner.connect()
    try {
      const { rows } = await owner.query<{ rolbypassrls: boolean }>(
        "select rolbypassrls from pg_roles where rolname = 'akoso_platform_view_owner'"
      )
      expect(rows).toEqual([{ rolbypassrls: true }])
    } finally {
      await owner.end()
    }
  })
})

// Kept as a typed example of reading the platform table through Drizzle's builder.
describe("reading a published figure through the query builder", () => {
  it("works inside withTenant() like any other table", async () => {
    const { pgSchema, integer, uuid } = await import("drizzle-orm/pg-core")
    const platform = pgSchema("platform")
    const counts = platform.table("spike_student_counts", {
      tenantId: uuid("tenant_id").primaryKey(),
      studentCount: integer("student_count").notNull(),
    })
    await publishStudentCounts()
    const rows = await withTenant(app.db, TENANT_B, (tx) =>
      tx
        .select({ studentCount: counts.studentCount })
        .from(counts)
        .where(eq(counts.tenantId, TENANT_B))
    )
    expect(rows).toEqual([{ studentCount: 2 }])
  })
})
