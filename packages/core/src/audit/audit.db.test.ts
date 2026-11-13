// The audit log against the local database (spec acceptance criteria 2 to 5). Each test
// group uses its own new school, so chains start empty. Run with `pnpm test:db`.
import { randomUUID } from "node:crypto"

import { afterAll, describe, expect, it } from "vitest"

import { createDatabase, sql, withTenant } from "@akoso/db"

import { testContext } from "../testing/index"
import { recordAudit } from "./record"
import { verifyAuditChain } from "./verify"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
// Superuser, straight to Postgres: creates test schools and plays the attacker.
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"

const app = createDatabase(APP_URL, 10)
const owner = createDatabase(OWNER_URL, 1)
afterAll(async () => {
  await app.close()
  await owner.close()
})

async function newSchool(): Promise<string> {
  const id = randomUUID()
  await owner.db.execute(sql`
    insert into platform.tenants (id, slug, name, status)
    values (${id}, ${`audit-${id.slice(0, 8)}`}, 'Audit Test School', 'active')`)
  return id
}

const ctxFor = (tenantId: string) =>
  testContext({
    db: app.db,
    tenantId,
    userId: "7a000000-0000-4000-8000-000000000003",
  })

async function record(tenantId: string, entityId: string) {
  const ctx = ctxFor(tenantId)
  await withTenant(app.db, tenantId, (tx) =>
    recordAudit(tx, ctx, {
      action: "test.thing.changed",
      entityType: "thing",
      entityId,
      changes: { name: { before: "a", after: "b" } },
    })
  )
}

const rowsOf = async (tenantId: string) =>
  (
    await owner.db.execute(sql`
      select seq, actor, prev_hash, hash from platform.audit_events
      where tenant_id = ${tenantId} order by seq`)
  ).rows

describe("recordAudit", () => {
  it("writes a numbered, chained record naming the actor by ID", async () => {
    const school = await newSchool()
    await record(school, "t1")
    await record(school, "t2")
    const rows = await rowsOf(school)
    expect(rows.map((row) => Number(row.seq))).toEqual([1, 2])
    expect(rows[0]?.actor).toBe("user:7a000000-0000-4000-8000-000000000003")
    expect(rows[0]?.prev_hash).toBe("0".repeat(64))
    expect(rows[1]?.prev_hash).toBe(rows[0]?.hash)
    expect(await verifyAuditChain(app.db, school)).toEqual({ ok: true })
  })

  it("leaves no record when the change rolls back", async () => {
    const school = await newSchool()
    await withTenant(app.db, school, async (tx) => {
      await recordAudit(tx, ctxFor(school), {
        action: "test.thing.changed",
        entityType: "thing",
        entityId: "t1",
      })
      throw new Error("the change failed")
    }).catch(() => undefined)
    expect(await rowsOf(school)).toEqual([])
  })

  it("numbers 50 concurrent writes 1 to 50, with a whole chain", async () => {
    const school = await newSchool()
    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        record(school, `t${String(index)}`)
      )
    )
    const seqs = (await rowsOf(school)).map((row) => Number(row.seq))
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, index) => index + 1))
    expect(await verifyAuditChain(app.db, school)).toEqual({ ok: true })
  })
})

describe("append-only", () => {
  it("lets the app role neither change nor remove a record, nor touch the chain heads", async () => {
    const school = await newSchool()
    await record(school, "t1")
    const asSchool = <T>(work: Parameters<typeof withTenant<T>>[2]) =>
      withTenant(app.db, school, work)
    await expect(
      asSchool((tx) =>
        tx.execute(sql`update platform.audit_events set action = 'x.y'`)
      )
    ).rejects.toThrow()
    await expect(
      asSchool((tx) => tx.execute(sql`delete from platform.audit_events`))
    ).rejects.toThrow()
    await expect(
      asSchool((tx) =>
        tx.execute(sql`select * from platform.audit_chain_heads`)
      )
    ).rejects.toThrow()
  })
})

describe("verifyAuditChain catches tampering", () => {
  async function chainOfThree(): Promise<string> {
    const school = await newSchool()
    for (const id of ["t1", "t2", "t3"]) await record(school, id)
    return school
  }

  it("an edited record", async () => {
    const school = await chainOfThree()
    await owner.db.execute(sql`
      update platform.audit_events set changes = '{"name":{"before":"a","after":"z"}}'
      where tenant_id = ${school} and seq = 2`)
    expect(await verifyAuditChain(app.db, school)).toEqual({
      ok: false,
      brokenSeq: 2,
      reason: "content changed",
    })
  })

  it("a deleted record in the middle", async () => {
    const school = await chainOfThree()
    await owner.db.execute(
      sql`delete from platform.audit_events where tenant_id = ${school} and seq = 2`
    )
    expect(await verifyAuditChain(app.db, school)).toEqual({
      ok: false,
      brokenSeq: 2,
      reason: "missing record",
    })
  })

  it("a deleted newest record", async () => {
    const school = await chainOfThree()
    await owner.db.execute(
      sql`delete from platform.audit_events where tenant_id = ${school} and seq = 3`
    )
    expect(await verifyAuditChain(app.db, school)).toEqual({
      ok: false,
      brokenSeq: 3,
      reason: "newest records missing",
    })
  })

  it("an inserted record that skips the trigger", async () => {
    const school = await chainOfThree()
    await owner.db.execute(
      sql`alter table platform.audit_events disable trigger audit_events_chain`
    )
    try {
      await owner.db.execute(sql`
        insert into platform.audit_events
          (tenant_id, seq, actor, action, entity_type, entity_id, prev_hash, hash)
        select ${school}, 4, 'user:forged', 'test.forged', 'thing', 'x', hash, repeat('f', 64)
        from platform.audit_events where tenant_id = ${school} and seq = 3`)
    } finally {
      await owner.db.execute(
        sql`alter table platform.audit_events enable trigger audit_events_chain`
      )
    }
    const check = await verifyAuditChain(app.db, school)
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.brokenSeq).toBe(4)
  })
})
