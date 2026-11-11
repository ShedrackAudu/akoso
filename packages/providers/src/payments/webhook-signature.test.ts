import { describe, expect, it } from "vitest"

import { checkPaystackSignature, signLikePaystack } from "./webhook-signature"

const SECRET = "whsec_test_only_not_a_real_secret"
const NOW = 1_794_400_000
const body = new TextEncoder().encode(
  '{"event":"charge.success","data":{"reference":"T123","amount":4500000}}'
)

describe("checkPaystackSignature", () => {
  it("accepts a correctly signed, current event and says which key matched", () => {
    const header = signLikePaystack(body, SECRET, "whk_a", NOW)
    expect(checkPaystackSignature(body, header, [SECRET], NOW)).toEqual({
      ok: true,
      keyId: "whk_a",
    })
  })

  it("refuses a body changed after signing (for example, a bigger amount)", () => {
    const header = signLikePaystack(body, SECRET, "whk_a", NOW)
    const changed = new TextEncoder().encode(
      '{"event":"charge.success","data":{"reference":"T123","amount":9900000}}'
    )
    expect(checkPaystackSignature(changed, header, [SECRET], NOW)).toEqual({
      ok: false,
      reason: "mismatch",
    })
  })

  it("refuses an event signed with another secret", () => {
    const header = signLikePaystack(body, "whsec_someone_else", "whk_a", NOW)
    expect(checkPaystackSignature(body, header, [SECRET], NOW).ok).toBe(false)
  })

  it("refuses a replay more than 5 minutes old, and one dated in the future", () => {
    expect(
      checkPaystackSignature(
        body,
        signLikePaystack(body, SECRET, "k", NOW - 301),
        [SECRET],
        NOW
      )
    ).toEqual({ ok: false, reason: "stale" })
    expect(
      checkPaystackSignature(
        body,
        signLikePaystack(body, SECRET, "k", NOW + 301),
        [SECRET],
        NOW
      )
    ).toEqual({ ok: false, reason: "stale" })
    expect(
      checkPaystackSignature(
        body,
        signLikePaystack(body, SECRET, "k", NOW - 300),
        [SECRET],
        NOW
      ).ok
    ).toBe(true)
  })

  it("accepts during a key rotation, when either of two secrets signed it", () => {
    const old = "whsec_old_test_secret"
    const header = signLikePaystack(body, old, "whk_old", NOW)
    expect(checkPaystackSignature(body, header, [SECRET, old], NOW)).toEqual({
      ok: true,
      keyId: "whk_old",
    })
  })

  it("checks every v1 entry, so one bad entry beside a good one still passes", () => {
    const good = signLikePaystack(body, SECRET, "whk_new", NOW)
    const header = `t=${String(NOW)},v1=whk_old:${"0".repeat(128)},${good.split(",")[1] ?? ""}`
    expect(checkPaystackSignature(body, header, [SECRET], NOW)).toEqual({
      ok: true,
      keyId: "whk_new",
    })
  })

  it.each([
    ["no header", null, "missing"],
    ["an empty header", "  ", "missing"],
    ["no timestamp", `v1=k:${"a".repeat(128)}`, "malformed"],
    [
      "two timestamps",
      `t=${String(NOW)},t=${String(NOW)},v1=k:${"a".repeat(128)}`,
      "malformed",
    ],
    ["a non-numeric timestamp", `t=abc,v1=k:${"a".repeat(128)}`, "malformed"],
    ["no signature", `t=${String(NOW)}`, "malformed"],
    ["a short signature", `t=${String(NOW)},v1=k:abcd`, "mismatch"],
    ["upper-case hex", `t=${String(NOW)},v1=k:${"A".repeat(128)}`, "mismatch"],
  ] as const)("refuses %s", (_label, header, reason) => {
    expect(checkPaystackSignature(body, header, [SECRET], NOW)).toEqual({
      ok: false,
      reason,
    })
  })
})
