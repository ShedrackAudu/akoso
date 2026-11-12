// Sign-in storage rules against the local database (spec: stage-1-sign-in.md). The
// people come from packages/db/scripts/seed.mjs. Run with `pnpm test:db`.
import { randomUUID } from "node:crypto"

import { afterAll, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"

import { accessFor } from "./access"
import { checkStoredCode, protectStoredCode } from "./codes"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const handle = createDatabase(APP_URL, 2)
afterAll(() => handle.close())
const db = handle.db

const HASH_KEY = "test-only-hash-key-000000000000000000000"
const TEACHER = "7a000000-0000-4000-8000-000000000003"
const PROPRIETOR = "7a000000-0000-4000-8000-000000000001"
const TWO_SCHOOL_PARENT = "7a000000-0000-4000-8000-000000000012"

async function storeCode(identifier: string, code: string, minutes = 5) {
  await db.execute(sql`
    insert into platform.verifications (id, identifier, value, expires_at)
    values (${randomUUID()}, ${identifier},
            ${protectStoredCode(HASH_KEY, identifier, `${code}:0`)},
            now() + make_interval(mins => ${minutes}))`)
}

describe("stored sign-in codes", () => {
  const now = () => new Date()

  it("accepts the right code and never stores it in plain text", async () => {
    const identifier = `+23480${String(Date.now()).slice(-8)}`
    await storeCode(identifier, "482913")
    const stored = await db.execute(
      sql`select value from platform.verifications where identifier = ${identifier}`
    )
    expect(String(stored.rows[0]?.value)).not.toContain("482913")
    expect(
      await checkStoredCode(db, HASH_KEY, identifier, "482913", now())
    ).toBe(true)
  })

  it("counts wrong attempts and removes the code on the third", async () => {
    const identifier = `+23481${String(Date.now()).slice(-8)}`
    await storeCode(identifier, "111222")
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(
        await checkStoredCode(db, HASH_KEY, identifier, "999999", now())
      ).toBe(false)
    }
    // Even the right code is now refused: it is gone.
    expect(
      await checkStoredCode(db, HASH_KEY, identifier, "111222", now())
    ).toBe(false)
  })

  it("refuses an expired code", async () => {
    const identifier = `+23490${String(Date.now()).slice(-8)}`
    await storeCode(identifier, "333444", -1)
    expect(
      await checkStoredCode(db, HASH_KEY, identifier, "333444", now())
    ).toBe(false)
  })
})

describe("a person's access", () => {
  it("lists only the person's own active memberships", async () => {
    const parent = await accessFor(db, TWO_SCHOOL_PARENT)
    expect(parent.schools.map((s) => s.school.slug).sort()).toEqual([
      "greenfield",
      "st-annes",
    ])
    const teacher = await accessFor(db, TEACHER)
    expect(teacher.schools.map((s) => s.school.slug)).toEqual(["greenfield"])
    expect(teacher.schools[0]?.roles).toEqual(["teacher"])
  })

  it("sets session limits by the most demanding role", async () => {
    expect(await accessFor(db, TWO_SCHOOL_PARENT)).toMatchObject({
      mfaRequired: false,
      maxSessionSeconds: null,
      idleSeconds: null,
    })
    expect(await accessFor(db, TEACHER)).toMatchObject({
      mfaRequired: false,
      maxSessionSeconds: 7 * 24 * 3600,
      idleSeconds: 12 * 3600,
    })
    expect(await accessFor(db, PROPRIETOR)).toMatchObject({
      mfaRequired: true,
      maxSessionSeconds: 12 * 3600,
      idleSeconds: 2 * 3600,
    })
  })

  it("cannot read other people's memberships across schools", async () => {
    const all = await db.execute(
      sql`select count(*)::int as n from platform.memberships`
    )
    expect(all.rows[0]?.n).toBe(0)
  })
})

describe("security events", () => {
  it("are append-only for the app role", async () => {
    await db.execute(sql`
      insert into platform.security_events (user_id, kind, detail)
      values (${TEACHER}, 'sign_in', 'test')`)
    await expect(
      db.execute(sql`update platform.security_events set detail = 'changed'`)
    ).rejects.toThrow()
    await expect(
      db.execute(sql`delete from platform.security_events`)
    ).rejects.toThrow()
  })

  it("accept only known kinds", async () => {
    await expect(
      db.execute(sql`
        insert into platform.security_events (user_id, kind) values (${TEACHER}, 'made_up')`)
    ).rejects.toThrow()
  })
})
