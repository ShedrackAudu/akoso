import { describe, expect, it } from "vitest"

import { checkCellChange, todayIn } from "./cell-key"
import { SPIKE_STUDENTS } from "./fixtures"

const STUDENT = SPIKE_STUDENTS[0]?.id ?? ""
const TODAY = "2027-01-15"

describe("checkCellChange", () => {
  it("accepts a whole-number score within the maximum", () => {
    expect(checkCellChange(`score:${STUDENT}:CA1`, "20", TODAY)).toMatchObject({
      ok: true,
      cell: { kind: "score", componentKey: "CA1", maximum: 20 },
    })
  })

  it("accepts zero", () => {
    expect(checkCellChange(`score:${STUDENT}:EXAM`, "0", TODAY).ok).toBe(true)
  })

  it.each([
    ["above the maximum", "21", /above the CA1 maximum of 20/],
    ["a decimal", "10.5", /whole number/],
    ["negative", "-1", /whole number/],
    ["text", "ten", /whole number/],
    ["empty", "", /whole number/],
  ])("refuses a score that is %s", (_label, value, message) => {
    const result = checkCellChange(`score:${STUDENT}:CA1`, value, TODAY)
    expect(result.ok).toBe(false)
    expect(result.ok ? "" : result.message).toMatch(message)
  })

  it("refuses an unknown assessment", () => {
    expect(checkCellChange(`score:${STUDENT}:CA9`, "5", TODAY).ok).toBe(false)
  })

  it("refuses a student not in the class", () => {
    expect(
      checkCellChange(
        "score:0e000000-0000-4000-8000-999999999999:CA1",
        "5",
        TODAY
      ).ok
    ).toBe(false)
  })

  it("refuses extra parts smuggled into the key", () => {
    expect(checkCellChange(`score:${STUDENT}:CA1:extra`, "5", TODAY).ok).toBe(
      false
    )
  })

  it("accepts a register entry for today or earlier", () => {
    expect(
      checkCellChange(`attendance:${STUDENT}:${TODAY}`, "late", TODAY).ok
    ).toBe(true)
    expect(
      checkCellChange(`attendance:${STUDENT}:2027-01-14`, "absent", TODAY).ok
    ).toBe(true)
  })

  it("refuses a register entry for a future day", () => {
    expect(
      checkCellChange(`attendance:${STUDENT}:2027-01-16`, "present", TODAY).ok
    ).toBe(false)
  })

  it("refuses an unknown register status", () => {
    expect(
      checkCellChange(`attendance:${STUDENT}:${TODAY}`, "asleep", TODAY).ok
    ).toBe(false)
  })
})

describe("todayIn", () => {
  it("uses the school's time zone, not the server's", () => {
    // 23:30 UTC on 14 January is already 00:30 on 15 January in Lagos (UTC+1).
    const lateEvening = new Date("2027-01-14T23:30:00Z")
    expect(todayIn("Africa/Lagos", lateEvening)).toBe("2027-01-15")
    expect(todayIn("UTC", lateEvening)).toBe("2027-01-14")
  })
})
