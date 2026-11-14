// Small pieces the school-setup use cases share (spec: docs/specs/stage-2-school-setup-a.md).
import { sql, type TenantTransaction } from "@akoso/db"

import {
  authorize,
  ConflictError,
  ValidationError,
  type RequestContext,
} from "../kernel/index"

/** Reading the set-up: every staff role, or anyone who may change it. */
export function authorizeSetupRead(ctx: RequestContext): void {
  try {
    authorize(ctx, "setup.school.read")
  } catch {
    authorize(ctx, "setup.school.manage")
  }
}

/** A database value as text: strings and numbers as they are, anything else empty. */
export function asText(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "bigint")
    return value.toString()
  return ""
}

/** 1000 as "1,000". */
const withCommas = (value: number): string =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

/** A timestamp column as the version string the screens send back. */
export function versionOf(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return new Date(asText(value)).toISOString()
}

const CHANGED_ELSEWHERE =
  "Someone else changed this while you were editing. Refresh the page to see their change, then try again."

/** Refuses a save based on an older version than the row has now (item 3's conflict). */
export function checkVersion(current: unknown, sent: string | undefined): void {
  if (sent === undefined) return
  if (versionOf(current) !== versionOf(sent)) {
    throw new ConflictError(CHANGED_ELSEWHERE)
  }
}

/** The constraint a unique violation broke, or null when the error is something else. */
export function uniqueViolationOf(error: unknown): string | null {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
    const fields = current as { code?: unknown; constraint?: unknown }
    if (fields.code === "23505") {
      return typeof fields.constraint === "string" ? fields.constraint : ""
    }
    current = (current as { cause?: unknown }).cause
  }
  return null
}

/** Refuses when a school already has `limit` live rows in a table (the caps per school). */
export async function checkCap(
  tx: TenantTransaction,
  table: "classes" | "class_arms" | "subjects" | "non_school_days",
  limit: number,
  adding: number,
  what: string
): Promise<void> {
  const live =
    table === "non_school_days" ? sql`true` : sql`archived_at is null`
  const result = await tx.execute(
    sql`select count(*)::int as n from ${sql.raw(`school_setup.${table}`)} where ${live}`
  )
  const count = Number(result.rows[0]?.n ?? 0)
  if (count + adding > limit) {
    throw ValidationError.of(
      "",
      `A school can have at most ${withCommas(limit)} ${what}.`
    )
  }
}

/** Bumps a session's version, so two people saving its terms can't overwrite each other. */
export async function touchSession(
  tx: TenantTransaction,
  sessionId: string
): Promise<void> {
  await tx.execute(
    sql`update school_setup.academic_sessions set updated_at = now() where id = ${sessionId}`
  )
}
