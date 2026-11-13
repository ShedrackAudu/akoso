import { describe, expect, it } from "vitest"

import {
  addDays,
  endOfDay,
  formatDate,
  formatDateTime,
  isValidTimeZone,
  parseLocalDate,
  startOfDay,
  todayIn,
  type LocalDate,
} from "./time"

const LAGOS = "Africa/Lagos"
const day = (value: string) => value as LocalDate

describe("todayIn", () => {
  it("is already tomorrow in Lagos at 23:30 UTC", () => {
    expect(todayIn(LAGOS, new Date("2026-11-12T23:30:00Z"))).toBe("2026-11-13")
    expect(todayIn(LAGOS, new Date("2026-11-12T22:59:59Z"))).toBe("2026-11-12")
  })

  it("crosses month and year ends", () => {
    expect(todayIn(LAGOS, new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01")
    expect(todayIn(LAGOS, new Date("2028-02-28T23:30:00Z"))).toBe("2028-02-29")
  })
})

describe("startOfDay and endOfDay", () => {
  it("puts a Lagos day between 23:00 UTC the evening before and 23:00 UTC", () => {
    expect(startOfDay(day("2026-11-12"), LAGOS).toISOString()).toBe(
      "2026-11-11T23:00:00.000Z"
    )
    expect(endOfDay(day("2026-11-12"), LAGOS).toISOString()).toBe(
      "2026-11-12T23:00:00.000Z"
    )
  })

  it("handles a daylight-saving change (London, last Sunday of March)", () => {
    // The day is 23 hours long: midnight GMT to midnight BST.
    const start = startOfDay(day("2026-03-29"), "Europe/London")
    const end = endOfDay(day("2026-03-29"), "Europe/London")
    expect(start.toISOString()).toBe("2026-03-29T00:00:00.000Z")
    expect(end.toISOString()).toBe("2026-03-29T23:00:00.000Z")
  })
})

describe("formatting", () => {
  it("writes dates as dd/mm/yyyy", () => {
    expect(formatDate(day("2026-11-02"))).toBe("02/11/2026")
  })

  it("writes moments in the school's time, 24-hour", () => {
    expect(formatDateTime(new Date("2026-11-12T13:05:00Z"), LAGOS)).toBe(
      "12/11/2026, 14:05"
    )
  })
})

describe("parsing and zones", () => {
  it("accepts real calendar dates only", () => {
    expect(parseLocalDate("2028-02-29")).toBe("2028-02-29")
    expect(parseLocalDate("2026-02-29")).toBeNull()
    expect(parseLocalDate("12/11/2026")).toBeNull()
  })

  it("adds days across month ends", () => {
    expect(addDays(day("2026-01-31"), 1)).toBe("2026-02-01")
    expect(addDays(day("2026-03-01"), -1)).toBe("2026-02-28")
  })

  it("knows real time zones", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true)
    expect(isValidTimeZone("Africa/Atlantis")).toBe(false)
    expect(isValidTimeZone("")).toBe(false)
  })
})
