import { describe, expect, it } from "vitest"

import { diffForAudit } from "./record"

describe("diffForAudit", () => {
  it("records each changed field with its value before and after", () => {
    expect(
      diffForAudit(
        { name: "Ada", roles: ["teacher"], unchanged: 1 },
        { name: "Ada Obi", roles: ["teacher", "bursar"], unchanged: 1 }
      )
    ).toEqual({
      name: { before: "Ada", after: "Ada Obi" },
      roles: { before: ["teacher"], after: ["teacher", "bursar"] },
    })
  })

  it("never records a sensitive field's value, only that it changed", () => {
    const changes = diffForAudit(
      { bankAccount: "0123456789", name: "Ada" },
      { bankAccount: "9876543210", name: "Ada" },
      ["bankAccount"]
    )
    expect(changes).toEqual({ bankAccount: { changed: true } })
    expect(JSON.stringify(changes)).not.toMatch(/0123456789|9876543210/)
  })

  it("handles creation and deletion", () => {
    expect(diffForAudit(null, { name: "Ada" })).toEqual({
      name: { before: null, after: "Ada" },
    })
    expect(diffForAudit({ name: "Ada" }, null)).toEqual({
      name: { before: "Ada", after: null },
    })
  })
})
