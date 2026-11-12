import { describe, expect, it } from "vitest"

import { schoolSlugSchema, type SchoolSummary } from "@akoso/schemas/tenancy"

import { assertSchoolAllows } from "../kernel/index"
import { createSchoolCache, SchoolLookupBusyError } from "./cache"
import { findSchoolByHost, findSchoolBySlug } from "./lookup"
import { classifyHost } from "./host"

const BASE = "akoso.ng"

describe("classifyHost", () => {
  it.each([
    ["app.akoso.ng", { kind: "app" }],
    ["APP.Akoso.NG:443", { kind: "app" }],
    ["greenfield.akoso.ng", { kind: "school", slug: "greenfield" }],
    ["st-annes.akoso.ng.", { kind: "school", slug: "st-annes" }],
    [
      "portal.greenfieldschool.com",
      { kind: "custom", hostname: "portal.greenfieldschool.com" },
    ],
  ] as const)("%s", (host, expected) => {
    expect(classifyHost(host, BASE)).toEqual(expected)
  })

  it.each([
    "akoso.ng",
    "admin.akoso.ng", // the admin app is its own service
    "api.akoso.ng", // reserved
    "a.b.akoso.ng",
    "-bad.akoso.ng",
    "ab.akoso.ng", // too short to be a slug
    "203.0.113.7",
    "[::1]:3000",
    "localhost",
    "evil.localhost",
    "",
  ])("rejects %s", (host) => {
    expect(classifyHost(host, BASE).kind).toBe("unknown")
  })

  it("treats plain localhost as the app only for a local base domain", () => {
    expect(classifyHost("localhost:3000", "akoso.localhost")).toEqual({
      kind: "app",
    })
    expect(classifyHost("127.0.0.1:3200", "akoso.localhost")).toEqual({
      kind: "app",
    })
    expect(classifyHost("app.akoso.localhost:3000", "akoso.localhost")).toEqual(
      {
        kind: "app",
      }
    )
    expect(
      classifyHost("greenfield.akoso.localhost", "akoso.localhost")
    ).toEqual({
      kind: "school",
      slug: "greenfield",
    })
  })
})

describe("school slugs", () => {
  it.each(["greenfield", "st-annes", "school-2024", "abc"])(
    "accepts %s",
    (slug) => {
      expect(schoolSlugSchema.safeParse(slug).success).toBe(true)
    }
  )

  it.each([
    "ab",
    "Greenfield",
    "st--annes",
    "-start",
    "end-",
    "has space",
    "app",
    "admin",
    "www",
    "x".repeat(41),
  ])("rejects %s", (slug) => {
    expect(schoolSlugSchema.safeParse(slug).success).toBe(false)
  })
})

const school = (status: SchoolSummary["status"]): SchoolSummary => ({
  id: "9a000000-0000-4000-8000-000000000001",
  slug: "greenfield",
  name: "Greenfield Academy",
  status,
  timeZone: "Africa/Lagos",
})

describe("assertSchoolAllows", () => {
  it("allows reads and writes for onboarding and active schools", () => {
    for (const status of ["onboarding", "active"] as const) {
      expect(() => {
        assertSchoolAllows(school(status), true)
      }).not.toThrow()
    }
  })

  it("refuses everything for suspended and closed schools, each with its own reason", () => {
    expect(() => {
      assertSchoolAllows(school("suspended"), false)
    }).toThrow(/unavailable/)
    expect(() => {
      assertSchoolAllows(school("closed"), false)
    }).toThrow(/closed/)
  })

  it("never asks the database about a slug that cannot exist", async () => {
    const db = {
      execute: () => Promise.reject(new Error("should not be called")),
    } as unknown as Parameters<typeof findSchoolBySlug>[0]
    for (const slug of [
      "",
      "ab",
      "has space",
      "bad--slug",
      "x".repeat(41),
      "../etc",
    ]) {
      expect(await findSchoolBySlug(db, slug)).toBeNull()
    }
  })

  it("never asks the database about a hostname that cannot exist", async () => {
    const db = {
      execute: () => Promise.reject(new Error("should not be called")),
    } as unknown as Parameters<typeof findSchoolByHost>[0]
    for (const host of [
      "",
      "localhost",
      "no_underscores.example",
      "-dash.example",
      "space here.example",
      `${"a".repeat(250)}.example`,
    ]) {
      expect(await findSchoolByHost(db, host)).toBeNull()
    }
  })

  it("reserves the names Akoso may need for itself", () => {
    for (const slug of [
      "platform",
      "webhooks",
      "health",
      "internal",
      "branches",
    ]) {
      expect(schoolSlugSchema.safeParse(slug).success).toBe(false)
    }
  })

  it("allows reads but refuses writes for a school that is leaving", () => {
    expect(() => {
      assertSchoolAllows(school("read_only"), false)
    }).not.toThrow()
    expect(() => {
      assertSchoolAllows(school("read_only"), true)
    }).toThrow(/read-only/)
  })
})

describe("createSchoolCache", () => {
  it("serves hits for a minute and misses for 15 seconds", async () => {
    let clock = 0
    let loads = 0
    const cache = createSchoolCache({ now: () => clock })
    const load = (value: SchoolSummary | null) => () => {
      loads++
      return Promise.resolve(value)
    }
    await cache.get("greenfield", load(school("active")))
    await cache.get("greenfield", load(school("active")))
    expect(loads).toBe(1)
    clock = 61_000
    await cache.get("greenfield", load(school("suspended")))
    expect(loads).toBe(2)

    await cache.get("nobody", load(null))
    clock += 10_000
    await cache.get("nobody", load(null))
    expect(loads).toBe(3)
    clock += 6_000
    await cache.get("nobody", load(null))
    expect(loads).toBe(4)
  })

  it("never grows past its limit", async () => {
    let loads = 0
    const cache = createSchoolCache({ maxMisses: 2 })
    const load = () => {
      loads++
      return Promise.resolve(null)
    }
    await cache.get("a", load)
    await cache.get("b", load)
    await cache.get("c", load)
    await cache.get("a", load)
    expect(loads).toBe(4)
  })

  it("never lets a flood of misses push out a real school", async () => {
    let schoolLoads = 0
    const cache = createSchoolCache({ maxHits: 10, maxMisses: 10 })
    const real = () => {
      schoolLoads++
      return Promise.resolve(school("active"))
    }
    await cache.get("slug:greenfield", real)
    for (let i = 0; i < 40; i++) {
      await cache.get(`host:attacker-${String(i)}.example`, () =>
        Promise.resolve(null)
      )
    }
    await cache.get("slug:greenfield", real)
    expect(schoolLoads).toBe(1)
  })

  it("shares one database lookup between identical requests in flight", async () => {
    let loads = 0
    let release: (value: SchoolSummary | null) => void = () => undefined
    const cache = createSchoolCache()
    const load = () => {
      loads++
      return new Promise<SchoolSummary | null>((resolve) => (release = resolve))
    }
    const first = cache.get("slug:greenfield", load)
    const second = cache.get("slug:greenfield", load)
    release(school("active"))
    expect(await first).toEqual(await second)
    expect(loads).toBe(1)
  })

  it("says 'busy', never 'not found', once the per-second budget is spent", async () => {
    let clock = 0
    let loads = 0
    const cache = createSchoolCache({ maxLoadsPerSecond: 3, now: () => clock })
    const load = () => {
      loads++
      return Promise.resolve(null)
    }
    const outcomes: string[] = []
    for (let i = 0; i < 10; i++) {
      outcomes.push(
        await cache.get(`host:x${String(i)}.example`, load).then(
          (value) => (value === null ? "not found" : "found"),
          (error: unknown) =>
            error instanceof SchoolLookupBusyError ? "busy" : "error"
        )
      )
    }
    expect(loads).toBe(3)
    expect(outcomes).toEqual([
      ...Array<string>(3).fill("not found"),
      ...Array<string>(7).fill("busy"),
    ])
    clock = 1_000
    await cache.get("host:y.example", load)
    expect(loads).toBe(4)
  })

  it("keeps serving a real school from its last known details while the budget is spent", async () => {
    let clock = 0
    const cache = createSchoolCache({ maxLoadsPerSecond: 1, now: () => clock })
    await cache.get("slug:greenfield", () => Promise.resolve(school("active")))
    clock = 61_500 // expired, and a flood has used this second's budget
    await cache.get("slug:bogus", () => Promise.resolve(null))
    const served = await cache.get("slug:greenfield", () =>
      Promise.reject(new Error("should not be asked"))
    )
    expect(served?.slug).toBe("greenfield")
  })

  it("serves the last known details if the database fails, but not forever", async () => {
    let clock = 0
    const cache = createSchoolCache({ now: () => clock })
    await cache.get("slug:greenfield", () => Promise.resolve(school("active")))
    clock = 120_000
    const fallback = await cache.get("slug:greenfield", () =>
      Promise.reject(new Error("database down"))
    )
    expect(fallback?.slug).toBe("greenfield")
    clock = 60_000 + 10 * 60_000 + 1
    await expect(
      cache.get("slug:greenfield", () =>
        Promise.reject(new Error("database down"))
      )
    ).rejects.toThrow("database down")
  })

  it("refreshing an expired school does not evict another one", async () => {
    let clock = 0
    let loads = 0
    const cache = createSchoolCache({ maxHits: 2, now: () => clock })
    const load = () => {
      loads++
      return Promise.resolve(school("active"))
    }
    await cache.get("a", load)
    clock = 30_000
    await cache.get("b", load)
    clock = 61_000 // a has expired, b has not
    await cache.get("a", load)
    await cache.get("b", load)
    expect(loads).toBe(3)
  })
})
