import { z } from "zod"
import { describe, expect, it } from "vitest"

import { defineContract } from "@akoso/schemas/api"
import { CONTRACTS } from "@akoso/schemas/contracts/index"

import { ApiError, createApiClient } from "./index"

const createThing = defineContract({
  method: "POST",
  path: "/api/v1/things/{groupId}",
  summary: "Test only",
  permission: "test.thing.create",
  rateLimit: "write",
  input: z.object({ groupId: z.string(), name: z.string() }),
  output: z.object({ id: z.string() }),
})

const href = (url: string | URL | Request): string =>
  typeof url === "string" ? url : url instanceof URL ? url.href : url.url

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("createApiClient", () => {
  it("calls the health endpoint and returns the typed result", async () => {
    const seen: string[] = []
    const api = createApiClient(CONTRACTS, {
      baseUrl: "https://app.akoso.test",
      fetch: (url) => {
        seen.push(href(url))
        return Promise.resolve(jsonResponse(200, { status: "ok" }))
      },
    })
    const health = await api.getHealth({})
    expect(health.status).toBe("ok")
    expect(seen).toEqual(["https://app.akoso.test/api/v1/health"])
  })

  it("fills path parameters, sends the token, school and one idempotency key across retries", async () => {
    const calls: RequestInit[] = []
    const urls: string[] = []
    let failures = 1
    const api = createApiClient(
      { createThing },
      {
        baseUrl: "https://app.akoso.test",
        getToken: () => "token-1",
        getSchoolId: () => "school-1",
        makeIdempotencyKey: () => "key-12345678",
        fetch: (url, init) => {
          urls.push(href(url))
          calls.push(init ?? {})
          if (failures-- > 0) return Promise.reject(new TypeError("network"))
          return Promise.resolve(
            jsonResponse(200, { id: "t1", extra: "dropped" })
          )
        },
      }
    )
    const result = await api.createThing({ groupId: "g 1", name: "A" })
    expect(result).toEqual({ id: "t1" })
    expect(urls[1]).toBe("https://app.akoso.test/api/v1/things/g%201")
    expect(calls).toHaveLength(2)
    for (const init of calls) {
      const headers = init.headers as Record<string, string>
      expect(headers["Idempotency-Key"]).toBe("key-12345678")
      expect(headers.Authorization).toBe("Bearer token-1")
      expect(headers["X-Akoso-School"]).toBe("school-1")
      expect(init.body).toBe(JSON.stringify({ name: "A" }))
    }
  })

  it("turns Problem Details into an ApiError", async () => {
    const api = createApiClient(CONTRACTS, {
      baseUrl: "https://app.akoso.test",
      fetch: () =>
        Promise.resolve(
          jsonResponse(429, {
            type: "https://akoso.ng/errors/rate-limited",
            title:
              "Too many attempts in a short time. Please wait a minute and try again.",
            status: 429,
            code: "rate_limited",
            requestId: "req_x",
          })
        ),
    })
    const error = await api.getHealth({}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).problem.code).toBe("rate_limited")
  })

  it("checks input before sending anything", async () => {
    let sent = false
    const api = createApiClient(
      { createThing },
      {
        baseUrl: "https://app.akoso.test",
        fetch: () => {
          sent = true
          return Promise.resolve(jsonResponse(200, {}))
        },
      }
    )
    await expect(
      api.createThing({ groupId: "g", name: 1 as unknown as string })
    ).rejects.toThrow()
    expect(sent).toBe(false)
  })
})
