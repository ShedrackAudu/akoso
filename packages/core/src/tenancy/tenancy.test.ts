import { describe, expect, it } from "vitest"

import { schoolSlugSchema, type SchoolSummary } from "@akoso/schemas/tenancy"

import { assertSchoolAllows } from "../kernel/index"
import { createSchoolCache } from "./cache"
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

  it("refuses everything for suspended and closed schools", () => {
    for (const status of ["suspended", "closed"] as const) {
      expect(() => {
        assertSchoolAllows(school(status), false)
      }).toThrow(/unavailable/)
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
    const cache = createSchoolCache({ maxEntries: 2 })
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
})
