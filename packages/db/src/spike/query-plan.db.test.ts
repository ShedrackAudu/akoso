// Spike 01: does the row-level security policy let Postgres use the tenant index, or
// does every query scan every school's rows?
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, type DatabaseHandle } from "../client"
import { asTenant } from "./helpers"
import {
  CONNECTIONS,
  TENANT_A,
  createSpikeSchema,
  dropSpikeSchema,
} from "./setup"

const BULK_SCHOOLS = 200
const STUDENTS_PER_SCHOOL = 300

let app: DatabaseHandle

beforeAll(async () => {
  await createSpikeSchema()
  // Bulk rows for 200 made-up schools, written as the local superuser, which is the
  // only role that bypasses row-level security, so set-up is quick.
  const owner = new Client({ connectionString: CONNECTIONS.owner })
  await owner.connect()
  try {
    await owner.query(`
      insert into public.spike_students (tenant_id, full_name)
      select ('00000000-0000-4000-8000-' || lpad(s::text, 12, '0'))::uuid,
             'Bulk Test ' || n
      from generate_series(1, ${String(BULK_SCHOOLS)}) s,
           generate_series(1, ${String(STUDENTS_PER_SCHOOL)}) n;
      analyze public.spike_students;`)
  } finally {
    await owner.end()
  }
  app = createDatabase(CONNECTIONS.app, 2)
})

afterAll(async () => {
  await app.close()
  await dropSpikeSchema()
})

describe("query plan under the tenant policy", () => {
  it("reads one school's rows through the tenant index, not by scanning every school", async () => {
    const { rows } = await asTenant(
      app.db,
      TENANT_A,
      "explain (analyze, costs off, timing off, summary off) select id, full_name from public.spike_students"
    )
    const plan = rows.map((r) => String(r["QUERY PLAN"])).join("\n")
    console.info(
      `\nPlan for one school out of ${String(BULK_SCHOOLS + 2)}:\n${plan}`
    )
    expect(plan).toMatch(/spike_students_tenant_created_idx/)
    expect(plan).not.toMatch(/Seq Scan/)
  })
})
