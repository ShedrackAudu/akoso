// Cursor pagination (spec section 7). A cursor is opaque base64url text holding the
// sort position of the last item sent. It is validated when it comes back, and the
// query still runs inside withTenant(), so a forged cursor can only move within the
// caller's own school's rows.
import type { z } from "zod"

import { ValidationError } from "./errors"

export interface Page<Item> {
  data: Item[]
  nextCursor: string | null
}

export function encodeCursor(position: unknown): string {
  return Buffer.from(JSON.stringify(position), "utf8").toString("base64url")
}

/**
 * Reads a cursor back into a sort position.
 *
 * @throws ValidationError on the `cursor` field when it is not one this API made.
 */
export function decodeCursor<Position>(
  cursor: string,
  schema: z.ZodType<Position>
): Position {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    )
    const result = schema.safeParse(parsed)
    if (result.success) return result.data
  } catch {
    // Falls through to the same answer as a well-formed but wrong cursor.
  }
  throw ValidationError.of(
    "cursor",
    "This page link is not valid. Please start again from the first page."
  )
}

/**
 * Builds a page from `limit + 1` rows: the extra row only says whether there is more.
 *
 * @param rows Up to `limit + 1` rows in sort order.
 * @param positionOf The sort position of a row, put into the next cursor.
 */
export function toPage<Row, Item>(
  rows: readonly Row[],
  limit: number,
  positionOf: (row: Row) => unknown,
  toItem: (row: Row) => Item
): Page<Item> {
  const visible = rows.slice(0, limit)
  const last = visible.at(-1)
  return {
    data: visible.map(toItem),
    nextCursor:
      rows.length > limit && last !== undefined
        ? encodeCursor(positionOf(last))
        : null,
  }
}
