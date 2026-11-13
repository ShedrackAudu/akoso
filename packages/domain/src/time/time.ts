// Dates and times in a school's time zone (brief section 3.1). Pure: no I/O and no
// server-local time. Moments are Date objects (instants); calendar days are LocalDate
// strings, "YYYY-MM-DD". Built on Intl, so it also runs in the Expo app.

/** A calendar date with no time or zone, e.g. "2026-11-12". */
export type LocalDate = string & { readonly __brand: "LocalDate" }

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Checks and brands a "YYYY-MM-DD" date that exists in the calendar. */
export function parseLocalDate(value: string): LocalDate | null {
  const match = LOCAL_DATE.exec(value)
  if (match === null) return null
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return value as LocalDate
}

/** True for an IANA time zone the runtime knows, e.g. "Africa/Lagos". */
export function isValidTimeZone(name: string): boolean {
  if (name.trim() === "") return false
  try {
    new Intl.DateTimeFormat("en", { timeZone: name })
    return true
  } catch {
    return false
  }
}

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function partsIn(timeZone: string, moment: Date): Parts {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const values: Record<string, number> = {}
  for (const part of format.formatToParts(moment)) {
    if (part.type !== "literal") values[part.type] = Number(part.value)
  }
  return {
    year: values.year ?? 0,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  }
}

const pad = (value: number, width = 2): string =>
  String(value).padStart(width, "0")

const toLocalDate = (year: number, month: number, day: number): LocalDate =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}` as LocalDate

/** The date it is in `timeZone` at `moment`. At 23:30 UTC it is already tomorrow in Lagos. */
export function todayIn(timeZone: string, moment: Date): LocalDate {
  const parts = partsIn(timeZone, moment)
  return toLocalDate(parts.year, parts.month, parts.day)
}

/** How far `timeZone` is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(timeZone: string, instant: number): number {
  const parts = partsIn(timeZone, new Date(instant))
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** `date` plus `days` calendar days. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ]
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return toLocalDate(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate()
  )
}

/** The UTC moment the school's day `date` begins (local midnight). */
export function startOfDay(date: LocalDate, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ]
  const midnightAsUtc = Date.UTC(year, month - 1, day)
  // Twice, so a daylight-saving change on that day is taken into account.
  let instant = midnightAsUtc - offsetAt(timeZone, midnightAsUtc)
  instant = midnightAsUtc - offsetAt(timeZone, instant)
  return new Date(instant)
}

/**
 * The UTC moment the school's day `date` ends: the start of the next day. Use as an
 * exclusive bound: `at >= startOfDay(date) && at < endOfDay(date)`.
 */
export function endOfDay(date: LocalDate, timeZone: string): Date {
  return startOfDay(addDays(date, 1), timeZone)
}

/** dd/mm/yyyy (brief section 4.1). */
export function formatDate(date: LocalDate): string {
  const [year, month, day] = date.split("-")
  return `${day ?? ""}/${month ?? ""}/${year ?? ""}`
}

/** dd/mm/yyyy, HH:mm in the school's time, 24-hour. */
export function formatDateTime(moment: Date, timeZone: string): string {
  const parts = partsIn(timeZone, moment)
  return `${pad(parts.day)}/${pad(parts.month)}/${pad(parts.year, 4)}, ${pad(parts.hour)}:${pad(parts.minute)}`
}
