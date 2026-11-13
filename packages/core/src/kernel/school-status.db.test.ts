// School status rules in the request pipeline, against the seeded schools (packages/db/scripts/
// seed.mjs). Run with `pnpm test:db`.
import { randomUUID } from "node:crypto"

import { z } from "zod"
import { afterAll, describe, expect, it } from "vitest"

import { createDatabase } from "@akoso/db"
import { defineContract } from "@akoso/schemas/api"

import { findSchoolBySlug } from "../tenancy/index"
import { handleRequest } from "./http"
import { memoryLogger, testContext } from "../testing/index"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const handle = createDatabase(APP_URL, 2)
afterAll(() => handle.close())
const db = handle.db

describe("school status in the request pipeline", () => {
  const read = defineContract({
    method: "GET",
    path: "/api/v1/things",
    summary: "Test only",
    permission: "test.thing.read",
    rateLimit: "standard",
    input: z.object({}),
    output: z.object({ ok: z.boolean() }),
  })

  async function call(
    slug: string
  ): Promise<{ status: number; code?: string }> {
    const school = await findSchoolBySlug(db, slug)
    if (school === null) throw new Error(`seed is missing ${slug}`)
    const response = await handleRequest(
      read,
      () => Promise.resolve({ ok: true }),
      new Request("http://localhost/api/v1/things"),
      {
        db: () => db,
        log: memoryLogger().log,
        now: () => new Date(),
        resolveContext: (_request, base) =>
          Promise.resolve({
            ...testContext({
              ...base,
              tenantId: school.id,
              userId: `user_${randomUUID()}`,
              permissions: ["test.thing.read"],
            }),
            school,
          }),
        isAllowedOrigin: () => true,
        clientIp: () => `ip-${randomUUID()}`,
      }
    )
    const body = (await response.json()) as { code?: string }
    return { status: response.status, code: body.code }
  }

  it.each([
    ["greenfield", 200, undefined],
    ["unity-leaving", 200, undefined], // read-only: reads still work
    ["harmony-paused", 403, "school_unavailable"],
    ["pioneer-closed", 403, "school_closed"],
  ])("%s answers %i", async (slug, status, code) => {
    expect(await call(slug)).toEqual({ status, code })
  })

  it("refuses a write to a school that is leaving", async () => {
    const school = await findSchoolBySlug(db, "unity-leaving")
    if (school === null) throw new Error("seed is missing unity-leaving")
    const write = defineContract({
      method: "POST",
      path: "/api/v1/things",
      summary: "Test only",
      permission: "test.thing.create",
      rateLimit: "write",
      input: z.object({}),
      output: z.object({ ok: z.boolean() }),
    })
    let ran = false
    const response = await handleRequest(
      write,
      () => {
        ran = true
        return Promise.resolve({ ok: true })
      },
      new Request("http://localhost/api/v1/things", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `key-${randomUUID()}`,
        },
        body: "{}",
      }),
      {
        db: () => db,
        log: memoryLogger().log,
        now: () => new Date(),
        resolveContext: (_request, base) =>
          Promise.resolve({
            ...testContext({
              ...base,
              tenantId: school.id,
              permissions: ["test.thing.create"],
            }),
            school,
          }),
        isAllowedOrigin: () => true,
        clientIp: () => null,
      }
    )
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code: string }).code).toBe(
      "school_read_only"
    )
    expect(ran).toBe(false)
  })
})
