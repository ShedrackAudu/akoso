// Spike 02. Reading and checking a cell key and value from a phone's queue. Pure: no
// database, no clock except the "today" passed in.
import {
  SPIKE_ATTENDANCE_STATUSES,
  SPIKE_COMPONENTS,
  SPIKE_STUDENTS,
} from "./fixtures"

type ParsedCell =
  | { kind: "score"; studentId: string; componentKey: string; maximum: number }
  | { kind: "attendance"; studentId: string; date: string }

export type CellCheck =
  { ok: true; cell: ParsedCell } | { ok: false; message: string }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const WHOLE_NUMBER_PATTERN = /^\d{1,3}$/
const STUDENT_IDS = new Set(SPIKE_STUDENTS.map((s) => s.id))

/**
 * Checks one queued change before the server saves it. A phone's queue can be edited,
 * so nothing in it is trusted (brief section 28.3).
 *
 * @param cellKey "score:<studentId>:<component>" or "attendance:<studentId>:<yyyy-mm-dd>"
 * @param value What the teacher entered.
 * @param schoolToday Today's date in the school's time zone, as yyyy-mm-dd.
 * @returns The parsed cell, or a message the teacher can act on.
 */
export function checkCellChange(
  cellKey: string,
  value: string,
  schoolToday: string
): CellCheck {
  const [kind, studentId = "", detail = "", ...rest] = cellKey.split(":")
  if (rest.length > 0 || !STUDENT_IDS.has(studentId)) {
    return {
      ok: false,
      message: "This change is for a student not in this class.",
    }
  }

  if (kind === "score") {
    const component = SPIKE_COMPONENTS.find((c) => c.key === detail)
    if (component === undefined) {
      return { ok: false, message: "This change is for an unknown assessment." }
    }
    if (!WHOLE_NUMBER_PATTERN.test(value)) {
      return {
        ok: false,
        message: `This ${component.label} score must be a whole number. Please check it.`,
      }
    }
    if (Number(value) > component.maximum) {
      return {
        ok: false,
        message: `This score is above the ${component.label} maximum of ${String(component.maximum)}. Please check it.`,
      }
    }
    return {
      ok: true,
      cell: {
        kind: "score",
        studentId,
        componentKey: component.key,
        maximum: component.maximum,
      },
    }
  }

  if (kind === "attendance") {
    if (!DATE_PATTERN.test(detail) || Number.isNaN(Date.parse(detail))) {
      return { ok: false, message: "This register entry has no valid date." }
    }
    // Plain string comparison works for yyyy-mm-dd.
    if (detail > schoolToday) {
      return {
        ok: false,
        message: "A register cannot be taken for a future day.",
      }
    }
    if (!(SPIKE_ATTENDANCE_STATUSES as readonly string[]).includes(value)) {
      return { ok: false, message: "Choose present, absent, late or excused." }
    }
    return { ok: true, cell: { kind: "attendance", studentId, date: detail } }
  }

  return { ok: false, message: "This change is not one the school can save." }
}

/** Today's date in a time zone, as yyyy-mm-dd. Never the server's own time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // The en-CA format is yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}
