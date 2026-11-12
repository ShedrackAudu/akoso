import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// security.txt must stay valid (RFC 9116) and the same in both apps. It must be
// renewed before it expires; this test starts failing 60 days ahead.
const read = (app: string) =>
  readFileSync(
    join(__dirname, "..", app, "public", ".well-known", "security.txt"),
    "utf8"
  )

describe("security.txt", () => {
  const web = read("web")

  it("is the same for web and admin", () => {
    expect(read("admin")).toBe(web)
  })

  it("names a contact and a policy", () => {
    expect(web).toMatch(/^Contact: mailto:security@akoso\.ng$/m)
    expect(web).toMatch(/^Policy: https:\/\/\S+\/SECURITY\.md$/m)
  })

  it("expires within a year and not within the next 60 days", () => {
    const expires = Date.parse(/^Expires: (.+)$/m.exec(web)?.[1] ?? "")
    const day = 24 * 60 * 60 * 1000
    expect(expires - Date.now()).toBeGreaterThan(60 * day)
    expect(expires - Date.now()).toBeLessThanOrEqual(366 * day)
  })
})
