// Shapes for offline sync, shared by the phone and the server (brief section 20).
// Spike 02: the shapes are expected to survive into the real offline-sync module.
import { z } from "zod"

/** The most operations a phone sends in one request. */
export const SYNC_BATCH_LIMIT = 100

/** One change made on the phone, possibly while offline. */
export const syncOperationSchema = z.object({
  /** Made on the phone; the server uses it to recognise a repeat. */
  opId: z.uuid(),
  /** Which phone made the change, so its own earlier edits never count as conflicts. */
  deviceId: z.string().min(1).max(64),
  /** What was changed, e.g. "score:<studentId>:CA1". */
  cellKey: z.string().min(1).max(200),
  value: z.string().max(50),
  /** The server version of the cell the phone last saw. 0 if it has never been saved. */
  baseVersion: z.number().int().min(0),
})
export type SyncOperation = z.infer<typeof syncOperationSchema>

export const syncRequestSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(SYNC_BATCH_LIMIT),
})
export type SyncRequest = z.infer<typeof syncRequestSchema>

export const syncOutcomeSchema = z.enum([
  /** Saved. */
  "applied",
  /** Saved, over a change another phone made since this phone last synced. */
  "applied_over_conflict",
  /** Already received earlier; nothing changed this time. */
  "duplicate",
  /** Refused: the sheet was approved and locked. Kept on the phone. */
  "rejected_locked",
  /** Refused: the value or the cell is not valid. Kept on the phone. */
  "rejected_invalid",
])
export type SyncOutcome = z.infer<typeof syncOutcomeSchema>

export const syncResultSchema = z.object({
  opId: z.uuid(),
  outcome: syncOutcomeSchema,
  cellKey: z.string(),
  /** The cell's value on the server after this operation, if it was saved. */
  value: z.string().nullable(),
  version: z.number().int().nullable(),
  /** Why an operation was refused, in words a teacher can act on. */
  message: z.string().nullable(),
})
export type SyncResult = z.infer<typeof syncResultSchema>

export const syncResponseSchema = z.object({
  results: z.array(syncResultSchema),
})
export type SyncResponse = z.infer<typeof syncResponseSchema>
