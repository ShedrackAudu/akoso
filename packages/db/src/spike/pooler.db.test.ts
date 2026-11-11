// Spike 01: does the school setting stay inside its transaction when PgBouncer, in
// transaction mode, hands the same server connection from one school to the next?
import { sql } from "drizzle-orm"
import { Client } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, type DatabaseHandle } from "../client"
import { withTenant } from "../with-tenant"
import {
  CONNECTIONS,
  TENANT_A,
  TENANT_B,
  createSpikeSchema,
  dropSpikeSchema,
} from "./setup"

// More callers than PgBouncer's two server connections, so they must share them.
const CONCURRENT_CALLERS = 40

let app: DatabaseHandle

beforeAll(async () => {
  await createSpikeSchema()
  // Ten client connections into PgBouncer, which has only two to Postgres.
  app = createDatabase(CONNECTIONS.app, 10)
})

afterAll(async () => {
  await app.close()
  await dropSpikeSchema()
})

interface Observation {
  asked: string
  setting: string
  serverPid: number
  tenantsSeen: string[]
}

async function observe(tenantId: string): Promise<Observation> {
  return withTenant(app.db, tenantId, async (tx) => {
    // A short pause keeps transactions overlapping, so callers interleave.
    await tx.execute(sql`select pg_sleep(0.01)`)
    const result = await tx.execute(sql`
      select pg_backend_pid() as pid,
             current_setting('app.tenant_id', true) as setting,
             coalesce(array_agg(distinct tenant_id::text), '{}') as tenants
      from public.spike_students`)
    const row = result.rows[0] as {
      pid: number
      setting: string
      tenants: string[]
    }
    return {
      asked: tenantId,
      setting: row.setting,
      serverPid: row.pid,
      tenantsSeen: row.tenants,
    }
  })
}

describe("withTenant() behind PgBouncer in transaction mode", () => {
  it("keeps every caller to its own school while server connections are shared between schools", async () => {
    const observations = await Promise.all(
      Array.from({ length: CONCURRENT_CALLERS }, (_, i) =>
        observe(i % 2 === 0 ? TENANT_A : TENANT_B)
      )
    )

    for (const seen of observations) {
      expect(seen.setting).toBe(seen.asked)
      expect(seen.tenantsSeen).toEqual([seen.asked])
    }

    // Proof the test means something: at least one Postgres server process served
    // both schools, so a setting that outlived its transaction would have shown up.
    const pidsFor = (tenant: string): Set<number> =>
      new Set(
        observations.filter((o) => o.asked === tenant).map((o) => o.serverPid)
      )
    const shared = [...pidsFor(TENANT_A)].filter((pid) =>
      pidsFor(TENANT_B).has(pid)
    )
    expect(shared.length).toBeGreaterThan(0)
  })

  it("leaves nothing behind on the connection once the transaction ends", async () => {
    await observe(TENANT_A)
    for (let i = 0; i < 10; i += 1) {
      const { rows } = await app.pool.query<{ setting: string | null }>(
        "select current_setting('app.tenant_id', true) as setting"
      )
      expect(rows[0]?.setting ?? "").toBe("")
    }
  })
})

describe("negative control: a session-level setting, which withTenant() never uses", () => {
  it("does leak from one caller to the next through the pooler, which is why the setting must be transaction-scoped", async () => {
    // Hold both of PgBouncer's server connections at once, so the next caller must
    // get one of them, and set the school for the whole session on each.
    const holders = [
      new Client({ connectionString: CONNECTIONS.app }),
      new Client({ connectionString: CONNECTIONS.app }),
    ]
    const bystander = new Client({ connectionString: CONNECTIONS.app })
    await Promise.all([...holders, bystander].map((c) => c.connect()))
    const pollute = async (value: string): Promise<void> => {
      await Promise.all(holders.map((c) => c.query("BEGIN")))
      await Promise.all(
        holders.map((c) =>
          c.query("select set_config('app.tenant_id', $1, false)", [value])
        )
      )
      await Promise.all(holders.map((c) => c.query("COMMIT")))
    }

    try {
      await pollute(TENANT_A)
      // A different client, which never set any school, now sees school A's rows.
      const { rows } = await bystander.query<{ n: number }>(
        "select count(*)::int as n from public.spike_students"
      )
      expect(rows).toEqual([{ n: 3 }])
    } finally {
      await pollute("")
      await Promise.all([...holders, bystander].map((c) => c.end()))
    }
  })
})
