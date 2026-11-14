// The school calendar (school setup part A spec, sections 3 and 4): the days a school
// opened, and the fixed-date national holidays to suggest. Pure: calendar dates only
// (LocalDate), no time zones and no server clock.
import type { LocalDate } from "../time/index"

/** A date's position as a whole number of days, for counting. */
function dayNumber(date: LocalDate): number {
  const [year, month, day] = date.split("-").map(Number)
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / 86_400_000
}

function fromDayNumber(value: number): LocalDate {
  return new Date(value * 86_400_000).toISOString().slice(0, 10) as LocalDate
}

/** Monday to Friday. */
export function isWeekday(date: LocalDate): boolean {
  const weekday = new Date(dayNumber(date) * 86_400_000).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

export interface DateRange {
  startsOn: LocalDate
  endsOn: LocalDate
}

export interface TermDates extends DateRange {
  midTerm: DateRange | null
}

const within = (date: LocalDate, range: DateRange): boolean =>
  date >= range.startsOn && date <= range.endsOn

/**
 * Whether school opened on a date: a weekday inside a term, outside its mid-term break,
 * and not a non-school day (a holiday or closure).
 */
export function isSchoolDay(
  date: LocalDate,
  terms: readonly TermDates[],
  nonSchoolDays: readonly DateRange[]
): boolean {
  if (!isWeekday(date)) return false
  const term = terms.find((candidate) => within(date, candidate))
  if (term === undefined) return false
  if (term.midTerm !== null && within(date, term.midTerm)) return false
  return !nonSchoolDays.some((range) => within(date, range))
}

/** The number of days school opened in a term (brief 8: "days school opened"). */
export function countSchoolDays(
  term: TermDates,
  nonSchoolDays: readonly DateRange[]
): number {
  let count = 0
  for (
    let day = dayNumber(term.startsOn);
    day <= dayNumber(term.endsOn);
    day++
  ) {
    if (isSchoolDay(fromDayNumber(day), [term], nonSchoolDays)) count++
  }
  return count
}

/**
 * Nigeria's fixed-date public holidays falling within a range, to suggest for the
 * school to confirm. Holidays that move (Easter, the Eids, Maulud) are announced late,
 * so the school adds those itself (spec, open question 3).
 */
export function fixedHolidays(
  range: DateRange
): { date: LocalDate; name: string }[] {
  const fixed: [string, string][] = [
    ["01-01", "New Year's Day"],
    ["05-01", "Workers' Day"],
    ["06-12", "Democracy Day"],
    ["10-01", "Independence Day"],
    ["12-25", "Christmas Day"],
    ["12-26", "Boxing Day"],
  ]
  const firstYear = Number(range.startsOn.slice(0, 4))
  const lastYear = Number(range.endsOn.slice(0, 4))
  const found: { date: LocalDate; name: string }[] = []
  for (let year = firstYear; year <= lastYear; year++) {
    for (const [monthDay, name] of fixed) {
      const date = `${String(year)}-${monthDay}` as LocalDate
      if (within(date, range)) found.push({ date, name })
    }
  }
  return found.sort((a, b) => a.date.localeCompare(b.date))
}

/** The problems with a session's terms, in plain words; empty when they're fine. */
export function termProblems(
  terms: readonly (TermDates & {
    number: number
    resumesOn: LocalDate | null
  })[]
): { term: number; message: string }[] {
  const problems: { term: number; message: string }[] = []
  const ordered = [...terms].sort((a, b) => a.number - b.number)
  ordered.forEach((term, index) => {
    if (term.endsOn <= term.startsOn) {
      problems.push({
        term: term.number,
        message: "The term must end after it starts.",
      })
    }
    if (
      term.midTerm !== null &&
      (term.midTerm.endsOn < term.midTerm.startsOn ||
        !within(term.midTerm.startsOn, term) ||
        !within(term.midTerm.endsOn, term))
    ) {
      problems.push({
        term: term.number,
        message: "The mid-term break must fall inside the term.",
      })
    }
    if (term.resumesOn !== null && term.resumesOn <= term.endsOn) {
      problems.push({
        term: term.number,
        message: "Resumption must come after the term ends.",
      })
    }
    const next = ordered[index + 1]
    if (next !== undefined && next.startsOn <= term.endsOn) {
      problems.push({
        term: next.number,
        message: `Term ${String(next.number)} must start after term ${String(term.number)} ends.`,
      })
    }
  })
  return problems
}
