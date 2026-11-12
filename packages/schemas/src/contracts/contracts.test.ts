import { z } from "zod"
import { describe, expect, it } from "vitest"

import { defineContract, type Contract } from "../api"
import { CONTRACTS, KNOWN_ACTIONS } from "./index"

const all = Object.entries(CONTRACTS) as [string, Contract][]

describe("every contract", () => {
  it.each(all)(
    "%s names a known permission or is explicitly public",
    (_, contract) => {
      if (contract.public === true) return
      expect(KNOWN_ACTIONS.has(contract.permission)).toBe(true)
    }
  )

  it.each(all)("%s lives under /api/v1/", (_, contract) => {
    expect(contract.path).toMatch(/^\/api\/v1\/[a-z0-9{}\-/]+$/)
  })

  it("has a unique method and path", () => {
    const keys = all.map(([, c]) => `${c.method} ${c.path}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("skips rate limits only for the health check", () => {
    const unlimited = all
      .filter(([, c]) => c.rateLimit === "none")
      .map(([n]) => n)
    expect(unlimited).toEqual(["getHealth"])
  })
})

describe("defineContract", () => {
  const base = {
    method: "POST",
    path: "/api/v1/example",
    summary: "Example",
    input: z.object({ name: z.string() }),
    output: z.object({}),
  } as const

  it("makes the input strict, so unknown fields are rejected", () => {
    const contract = defineContract({
      ...base,
      permission: "example.thing.create",
      rateLimit: "write",
    })
    expect(contract.input.safeParse({ name: "a", tenantId: "x" }).success).toBe(
      false
    )
  })

  it("refuses to skip rate limits on a signed-in endpoint", () => {
    expect(() =>
      defineContract({
        ...base,
        permission: "example.thing.create",
        rateLimit: "none",
      })
    ).toThrow(/only public endpoints/)
  })
})
