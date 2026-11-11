// Spike 01 only. Small helpers shared by the spike's database tests.
import { sql } from "drizzle-orm"
import { expect } from "vitest"

import type { Database } from "../client"
import { withTenant } from "../with-tenant"

export interface RawResult {
  rows: Record<string, unknown>[]
  rowCount: number
}

/** Runs one statement inside withTenant() and returns its rows and row count. */
export async function asTenant(
  db: Database,
  tenantId: string,
  statement: string
): Promise<RawResult> {
  return withTenant(db, tenantId, async (tx) => {
    const result = await tx.execute(sql.raw(statement))
    return { rows: result.rows, rowCount: result.rowCount ?? 0 }
  })
}

/** Postgres error text, whether or not Drizzle wrapped the driver's error. */
export function errorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }
  const cause = error.cause instanceof Error ? ` ${error.cause.message}` : ""
  return `${error.message}${cause}`
}

/** Asserts the promise rejects with a database error whose text matches `pattern`. */
export async function expectDatabaseError(
  promise: Promise<unknown>,
  pattern: RegExp
): Promise<void> {
  const outcome = await promise.then(
    () => "resolved",
    (error: unknown) => errorText(error)
  )
  expect(outcome).not.toBe("resolved")
  expect(outcome).toMatch(pattern)
}
