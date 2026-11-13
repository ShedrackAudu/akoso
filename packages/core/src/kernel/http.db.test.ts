// The request pipeline end to end, against the local Postgres and PgBouncer (spec
// acceptance criteria 1 and 7). Run with `pnpm test:db` after `docker compose up -d`.
import { randomUUID } from "node:crypto"

import { z } from "zod"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { createDatabase, sql, withTenant } from "@akoso/db"
import { defineContract, type ActionKey } from "@akoso/schemas/api"

import type { RequestContext } from "./context"
import { NotFoundError } from "./errors"
import { handleRequest, type HttpDeps } from "./http"
import { memoryLogger, testContext } from "../testing/index"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const handle = createDatabase(APP_URL, 4)
afterAll(() => handle.close())

const TENANT = "0a000000-0000-4000-8000-00000000000a"
const PERMISSION: ActionKey = "test.thing.create"

const createThing = defineContract({
  method: "POST",
  path: "/api/v1/things",
  summary: "Test only",
  permission: PERMISSION,
  rateLimit: "write",
  maxBodyBytes: 200,
  input: z.object({ name: z.string().max(20), phone: z.string().optional() }),
  output: z.object({ id: z.string(), name: z.string() }),
})

const exportThings = defineContract({
  method: "GET",
  path: "/api/v1/things/export",
  summary: "Test only",
  permission: PERMISSION,
  rateLimit: "export",
  input: z.object({}),
  output: z.object({ ok: z.boolean() }),
})

let userId: string
let runs: number
let logged: string[]
let signedIn: "yes" | "no" | "not-a-member"

beforeEach(() => {
  // A new user each test, so rate-limit counts and idempotency keys never collide
  // with another test or an earlier run.
  userId = `user_${randomUUID()}`
  runs = 0
  signedIn = "yes"
})

function deps(
  permissions: ActionKey[] = [PERMISSION],
  tenantId = TENANT,
  ip = "203.0.113.7"
): HttpDeps {
  const memory = memoryLogger()
  logged = memory.lines
  return {
    db: () => handle.db,
    log: memory.log,
    now: () => new Date(),
    resolveContext: (_request, base) => {
      if (signedIn === "no") return Promise.resolve(null)
      if (signedIn === "not-a-member") throw new NotFoundError()
      return Promise.resolve<RequestContext>(
        testContext({ ...base, tenantId, userId, permissions })
      )
    },
    isAllowedOrigin: (origin) => origin === "https://app.akoso.test",
    clientIp: () => ip,
  }
}

const create = (_ctx: unknown, input: { name: string }) => {
  runs++
  return Promise.resolve({
    id: `thing-${String(runs)}`,
    name: input.name,
    secret: "never sent",
  })
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/v1/things", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `key_${userId.slice(-12)}`,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

const problem = async (response: Response) =>
  (await response.json()) as { code: string; errors?: { path: string }[] }

describe("handleRequest", () => {
  it("runs the use case once, drops undeclared fields and returns a request ID", async () => {
    const response = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: "thing-1", name: "Ada" })
    expect(response.headers.get("X-Request-Id")).toMatch(/^req_/)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("replays a repeated write instead of running it again", async () => {
    const first = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    const again = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    expect(runs).toBe(1)
    expect(again.status).toBe(200)
    expect(again.headers.get("Idempotent-Replayed")).toBe("true")
    expect(await again.json()).toEqual(await first.json())
  })

  it("refuses the same key with a different request", async () => {
    await handleRequest(createThing, create, post({ name: "Ada" }), deps())
    const other = await handleRequest(
      createThing,
      create,
      post({ name: "Bola" }),
      deps()
    )
    expect(other.status).toBe(422)
    expect((await problem(other)).code).toBe("idempotency_mismatch")
    expect(runs).toBe(1)
  })

  it("answers 409 while the first attempt is still running", async () => {
    let release: () => void = () => undefined
    const slow = async (ctx: unknown, input: { name: string }) => {
      await new Promise<void>((resolve) => (release = resolve))
      return create(ctx, input)
    }
    const first = handleRequest(
      createThing,
      slow,
      post({ name: "Ada" }),
      deps()
    )
    await new Promise((resolve) => setTimeout(resolve, 200))
    const second = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    release()
    expect(second.status).toBe(409)
    expect((await first).status).toBe(200)
  })

  it("forgets the key after a bug, so the retry runs", async () => {
    const broken = () => Promise.reject(new Error("boom"))
    const failed = await handleRequest(
      createThing,
      broken,
      post({ name: "Ada" }),
      deps()
    )
    expect(failed.status).toBe(500)
    const retried = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    expect(retried.status).toBe(200)
  })

  it("requires an idempotency key on writes", async () => {
    const request = new Request("http://localhost/api/v1/things", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    })
    const response = await handleRequest(createThing, create, request, deps())
    expect(response.status).toBe(400)
    expect(runs).toBe(0)
  })

  it.each([
    ["not signed in", "no", 401],
    ["not a member of the school", "not-a-member", 404],
  ] as const)("answers %s with %i", async (_, state, status) => {
    signedIn = state
    const response = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps()
    )
    expect(response.status).toBe(status)
    expect(runs).toBe(0)
  })

  it("answers 403 without the permission", async () => {
    const response = await handleRequest(
      createThing,
      create,
      post({ name: "Ada" }),
      deps([])
    )
    expect(response.status).toBe(403)
    expect(runs).toBe(0)
  })

  it("refuses a cookie write from another origin", async () => {
    const request = post(
      { name: "Ada" },
      { Cookie: "s=1", Origin: "https://evil.example" }
    )
    const response = await handleRequest(createThing, create, request, deps())
    expect(response.status).toBe(403)
  })

  it.each([
    ["an unknown field", { name: "Ada", tenantId: TENANT }, 422, "validation"],
    ["a bad value", { name: "x".repeat(21) }, 422, "validation"],
    ["malformed JSON", "{not json", 422, "validation"],
    [
      "a body over the limit",
      { name: "Ada", phone: "1".repeat(300) },
      413,
      "payload_too_large",
    ],
  ])("rejects %s", async (_, body, status, code) => {
    const response = await handleRequest(
      createThing,
      create,
      post(body),
      deps()
    )
    expect(response.status).toBe(status)
    expect((await problem(response)).code).toBe(code)
    expect(response.headers.get("Content-Type")).toBe(
      "application/problem+json"
    )
    expect(runs).toBe(0)
  })

  it("rejects a body that is not JSON", async () => {
    const request = post("name=Ada", {
      "Content-Type": "application/x-www-form-urlencoded",
    })
    const response = await handleRequest(createThing, create, request, deps())
    expect(response.status).toBe(415)
  })

  it("names each field at fault", async () => {
    const response = await handleRequest(
      createThing,
      create,
      post({ name: 5 }),
      deps()
    )
    expect((await problem(response)).errors?.map((e) => e.path)).toEqual([
      "name",
    ])
  })

  it("answers 500 without details when the output breaks the contract", async () => {
    const wrong = () =>
      Promise.resolve({ id: 1 } as unknown as { id: string; name: string })
    const response = await handleRequest(
      createThing,
      wrong,
      post({ name: "Ada" }),
      deps()
    )
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toMatch(/contract|Output/)
  })

  it("rate-limits per user, with Retry-After", async () => {
    // Its own school and IP, so only this test's requests count against the limits.
    const limited = deps([PERMISSION], randomUUID(), `ip-${randomUUID()}`)
    const get = () => new Request("http://localhost/api/v1/things/export")
    const ok = () => Promise.resolve({ ok: true })
    const minute = () => Math.floor(Date.now() / 60_000)
    const startedIn = minute()
    const statuses: number[] = []
    let last: Response | undefined
    for (let i = 0; i < 6; i++) {
      last = await handleRequest(exportThings, ok, get(), limited)
      statuses.push(last.status)
    }
    // The export class allows 5 a minute per user. If the minute rolled over during
    // the loop, a fresh window began and the sixth may pass; skip the check then.
    if (minute() !== startedIn) return
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
    expect(Number(last?.headers.get("Retry-After"))).toBeGreaterThan(0)
  })

  it("never logs bodies, tokens or phone numbers", async () => {
    const request = post(
      { name: "Ada", phone: "08031234567" },
      { Authorization: "Bearer secret-token-xyz" }
    )
    const shared = deps()
    await handleRequest(createThing, create, request, shared)
    const broken = () => Promise.reject(new Error("boom"))
    const second = post(
      { name: "Ada", phone: "08031234567" },
      { "Idempotency-Key": "other-key-123" }
    )
    await handleRequest(createThing, broken, second, shared)
    const text = logged.join("\n")
    expect(logged.length).toBeGreaterThan(0)
    expect(text).not.toMatch(/08031234567|secret-token-xyz|Ada/)
    expect(JSON.parse(logged[0] ?? "")).toMatchObject({
      msg: "Request",
      route: "/api/v1/things",
      status: 200,
      tenantId: TENANT,
    })
  })

  it("keeps idempotency keys inside the school", async () => {
    await handleRequest(createThing, create, post({ name: "Ada" }), deps())
    const count = (tenantId: string) =>
      withTenant(handle.db, tenantId, (tx) =>
        tx.execute(
          sql`select count(*)::int as n from platform.idempotency_keys where user_id = ${userId}`
        )
      )
    expect((await count(TENANT)).rows[0]?.n).toBe(1)
    expect(
      (await count("0b000000-0000-4000-8000-00000000000b")).rows[0]?.n
    ).toBe(0)
  })
})
