// School lookups against the seeded schools (packages/db/scripts/
// seed.mjs). Run with `pnpm test:db`.
import { randomUUID } from "node:crypto"

import { afterAll, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"

import { findSchoolByHost, findSchoolById, findSchoolBySlug } from "./lookup"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const handle = createDatabase(APP_URL, 2)
afterAll(() => handle.close())
const db = handle.db

describe("school lookups", () => {
  it("finds a school by slug, case-insensitively, with public fields only", async () => {
    const found = await findSchoolBySlug(db, "Greenfield")
    expect(found).toEqual({
      id: "9a000000-0000-4000-8000-000000000001",
      slug: "greenfield",
      name: "Greenfield Academy",
      status: "active",
      timeZone: "Africa/Lagos",
    })
  })

  it("finds a school by ID, and nothing for a malformed or unknown ID", async () => {
    expect(
      (await findSchoolById(db, "9a000000-0000-4000-8000-000000000002"))?.slug
    ).toBe("st-annes")
    expect(await findSchoolById(db, "not-a-uuid")).toBeNull()
    expect(await findSchoolById(db, randomUUID())).toBeNull()
  })

  it("finds nothing for an unknown slug or a host with no active domain", async () => {
    expect(await findSchoolBySlug(db, "no-such-school")).toBeNull()
    expect(await findSchoolByHost(db, "portal.unknown.example")).toBeNull()
  })

  it("does not let the app role read the tenancy tables directly", async () => {
    await expect(
      db.execute(sql`select * from platform.tenants`)
    ).rejects.toThrow()
    await expect(
      db.execute(sql`select * from platform.groups`)
    ).rejects.toThrow()
  })
})
