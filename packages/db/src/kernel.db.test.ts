// Tenant isolation and access rules for the kernel tables (spec acceptance criterion 6).
import { afterAll, describe, expect, it } from "vitest"

import { createDatabase } from "./client"
import { sql } from "drizzle-orm"
import { withTenant } from "./with-tenant"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const TENANT_A = "0a000000-0000-4000-8000-00000000000a"
const TENANT_B = "0b000000-0000-4000-8000-00000000000b"

const handle = createDatabase(APP_URL, 2)
afterAll(() => handle.close())
const db = handle.db

const unique = () =>
  `iso_${String(Date.now())}_${String(Math.random()).slice(2, 10)}`

async function failure(work: Promise<unknown>): Promise<string> {
  return work.then(
    () => "succeeded",
    (error: unknown) =>
      error instanceof Error
        ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`
        : String(error)
  )
}

describe("platform.idempotency_keys", () => {
  it("is invisible to another school, for reading, changing and deleting", async () => {
    const key = unique()
    await withTenant(db, TENANT_A, (tx) =>
      tx.execute(sql`insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
                     values (${TENANT_A}, 'u1', ${key}, 'h', 'running')`)
    )
    const asB = await withTenant(db, TENANT_B, async (tx) => ({
      read: await tx.execute(
        sql`select 1 from platform.idempotency_keys where key = ${key}`
      ),
      updated: await tx.execute(
        sql`update platform.idempotency_keys set state = 'done' where key = ${key}`
      ),
      deleted: await tx.execute(
        sql`delete from platform.idempotency_keys where key = ${key}`
      ),
    }))
    expect(asB.read.rowCount).toBe(0)
    expect(asB.updated.rowCount).toBe(0)
    expect(asB.deleted.rowCount).toBe(0)
    const stillThere = await withTenant(db, TENANT_A, (tx) =>
      tx.execute(
        sql`select state from platform.idempotency_keys where key = ${key}`
      )
    )
    expect(stillThere.rows).toEqual([{ state: "running" }])
  })

  it("refuses a row written for another school", async () => {
    const outcome = await failure(
      withTenant(db, TENANT_B, (tx) =>
        tx.execute(sql`insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
                       values (${TENANT_A}, 'u1', ${unique()}, 'h', 'running')`)
      )
    )
    expect(outcome).toMatch(/row-level security/)
  })

  it("shows nothing without a school", async () => {
    const result = await db.execute(
      sql`select count(*)::int as n from platform.idempotency_keys`
    )
    expect(result.rows[0]?.n).toBe(0)
  })

  it("accepts only the two states", async () => {
    const outcome = await failure(
      withTenant(db, TENANT_A, (tx) =>
        tx.execute(sql`insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state)
                       values (${TENANT_A}, 'u1', ${unique()}, 'h', 'pending')`)
      )
    )
    expect(outcome).toMatch(/idempotency_keys_state_check/)
  })

  it("is purged after 24 hours, for every school, and not before", async () => {
    const [oldKey, newKey] = [unique(), unique()]
    await withTenant(db, TENANT_B, (tx) =>
      tx.execute(sql`insert into platform.idempotency_keys (tenant_id, user_id, key, request_hash, state, created_at)
                     values (${TENANT_B}, 'u1', ${oldKey}, 'h', 'done', now() - interval '25 hours'),
                            (${TENANT_B}, 'u1', ${newKey}, 'h', 'done', now())`)
    )
    await db.execute(sql`select platform.purge_expired_idempotency_keys()`)
    const left = await withTenant(db, TENANT_B, (tx) =>
      tx.execute(
        sql`select key from platform.idempotency_keys where key in (${oldKey}, ${newKey})`
      )
    )
    expect(left.rows).toEqual([{ key: newKey }])
  })
})

describe("platform.rate_limit_windows", () => {
  it("cannot be read or changed by the app role, only counted through the function", async () => {
    expect(
      await failure(db.execute(sql`select * from platform.rate_limit_windows`))
    ).toMatch(/permission denied/)
    expect(
      await failure(db.execute(sql`delete from platform.rate_limit_windows`))
    ).toMatch(/permission denied/)
    const bucket = unique()
    const first = await db.execute(
      sql`select platform.hit_rate_limit(${bucket}, 60) as n`
    )
    const second = await db.execute(
      sql`select platform.hit_rate_limit(${bucket}, 60) as n`
    )
    expect(Number(second.rows[0]?.n) - Number(first.rows[0]?.n)).toBe(1)
  })

  it("rejects silly arguments", async () => {
    expect(
      await failure(db.execute(sql`select platform.hit_rate_limit('b', 0)`))
    ).toMatch(/invalid rate limit arguments/)
  })
})
