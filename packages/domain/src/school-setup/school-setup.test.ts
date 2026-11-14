import { describe, expect, it } from "vitest"

import type { LocalDate } from "../time/index"
import {
  countSchoolDays,
  fixedHolidays,
  isSchoolDay,
  isWeekday,
  termProblems,
} from "./calendar"
import { presetSubjects, subjectLimits } from "./curriculum"

const d = (value: string) => value as LocalDate

describe("the school calendar", () => {
  // Monday 7 September 2026 to Friday 18 September 2026: ten weekdays.
  const term = {
    startsOn: d("2026-09-07"),
    endsOn: d("2026-09-18"),
    midTerm: null,
  }

  it("knows weekends", () => {
    expect(isWeekday(d("2026-09-12"))).toBe(false) // Saturday
    expect(isWeekday(d("2026-09-14"))).toBe(true) // Monday
  })

  it("counts the days school opened, by hand", () => {
    expect(countSchoolDays(term, [])).toBe(10)
    // A Monday holiday, and a holiday on a Saturday that changes nothing.
    const off = [
      { startsOn: d("2026-09-14"), endsOn: d("2026-09-14") },
      { startsOn: d("2026-09-12"), endsOn: d("2026-09-12") },
    ]
    expect(countSchoolDays(term, off)).toBe(9)
    // A mid-term break of three weekdays.
    const withBreak = {
      ...term,
      midTerm: { startsOn: d("2026-09-15"), endsOn: d("2026-09-17") },
    }
    expect(countSchoolDays(withBreak, off)).toBe(6)
  })

  it("says no school outside any term", () => {
    expect(isSchoolDay(d("2026-09-21"), [term], [])).toBe(false)
  })

  it("suggests only the fixed holidays inside the session", () => {
    const names = fixedHolidays({
      startsOn: d("2026-09-07"),
      endsOn: d("2027-07-23"),
    }).map((holiday) => `${holiday.date} ${holiday.name}`)
    expect(names).toEqual([
      "2026-10-01 Independence Day",
      "2026-12-25 Christmas Day",
      "2026-12-26 Boxing Day",
      "2027-01-01 New Year's Day",
      "2027-05-01 Workers' Day",
      "2027-06-12 Democracy Day",
    ])
  })

  it("explains term problems in plain words", () => {
    const problems = termProblems([
      { number: 1, ...term, resumesOn: d("2026-09-10") },
      {
        number: 2,
        startsOn: d("2026-09-15"),
        endsOn: d("2026-12-11"),
        midTerm: { startsOn: d("2027-01-01"), endsOn: d("2027-01-02") },
        resumesOn: null,
      },
    ]).map((problem) => problem.message)
    expect(problems).toEqual([
      "Resumption must come after the term ends.",
      "Term 2 must start after term 1 ends.",
      "The mid-term break must fall inside the term.",
    ])
  })
})

describe("NERDC presets", () => {
  it("give Primary 4 the 2025 list and Primary 6 the old one", () => {
    const p4 = presetSubjects("primary_4", "nerdc_2025", null).map((s) => s.key)
    const p6 = presetSubjects("primary_6", "nerdc_pre2025", null).map(
      (s) => s.key
    )
    expect(p4).toContain("basic_digital_literacy")
    expect(p4).toContain("nigerian_history")
    expect(p6).toContain("religion_national_values")
    expect(p6).not.toContain("nigerian_history")
  })

  it("add a senior field's subjects to the core", () => {
    const science = presetSubjects("sss_1", "nerdc_2025", "science").map(
      (s) => s.key
    )
    expect(science).toContain("english_language")
    expect(science).toContain("physics")
    expect(science).not.toContain("accounting")
  })

  it("leave nursery and the school's own curriculum empty", () => {
    expect(presetSubjects("nursery_1", "nerdc_2025", null)).toEqual([])
    expect(presetSubjects("primary_1", "own", null)).toEqual([])
  })

  it("set limits only for 2025 arms", () => {
    expect(subjectLimits("primary_4", "nerdc_2025")).toEqual({
      min: 11,
      max: 13,
    })
    expect(subjectLimits("jss_2", "nerdc_2025")).toEqual({ min: 12, max: 14 })
    expect(subjectLimits("primary_4", "nerdc_pre2025")).toBeNull()
  })
})
