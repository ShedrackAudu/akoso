// Spike 02. The server side of offline sync: applying queued changes exactly once,
// in the order the phone made them, with the conflict rule from brief section 20.
import {
  createDatabase,
  sql,
  withTenant,
  type DatabaseHandle,
  type TenantTransaction,
} from "@akoso/db"
import type {
  SyncOperation,
  SyncOutcome,
  SyncResult,
} from "@akoso/schemas/offline-sync"

import { loadEnv } from "../../config/index"
import { checkCellChange, todayIn } from "./cell-key"
import {
  SPIKE_CLASS_NAME,
  SPIKE_COMPONENTS,
  SPIKE_SCHOOL_TIME_ZONE,
  SPIKE_STUDENTS,
  SPIKE_SUBJECT_NAME,
  SPIKE_TEACHER_ID,
  SPIKE_TENANT_ID,
  type SpikeComponent,
  type SpikeStudent,
} from "./fixtures"

let handle: DatabaseHandle | undefined

// One pool per server process, opened on first use.
function database(): DatabaseHandle {
  handle ??= createDatabase(loadEnv(process.env).DATABASE_URL)
  return handle
}

async function rows<T>(
  tx: TenantTransaction,
  query: ReturnType<typeof sql>
): Promise<T[]> {
  const result = await tx.execute(query)
  return result.rows as T[]
}

export interface SpikeSheet {
  className: string
  subjectName: string
  schoolToday: string
  locked: boolean
  students: readonly SpikeStudent[]
  components: readonly SpikeComponent[]
  cells: { cellKey: string; value: string; version: number }[]
}

export interface SpikeSwitches {
  sheetLocked: boolean
  sessionExpired: boolean
}

async function switches(tx: TenantTransaction): Promise<SpikeSwitches> {
  const found = await rows<{ sheet_locked: boolean; session_expired: boolean }>(
    tx,
    sql`select sheet_locked, session_expired from spike_offline.state`
  )
  const row = found[0]
  return {
    sheetLocked: row?.sheet_locked ?? false,
    sessionExpired: row?.session_expired ?? false,
  }
}

/** Everything a phone needs to show the sheet and register, and work offline after. */
export async function getSpikeSheet(): Promise<SpikeSheet> {
  return withTenant(database().db, SPIKE_TENANT_ID, async (tx) => {
    const state = await switches(tx)
    const cells = await rows<{
      cell_key: string
      value: string
      version: number
    }>(
      tx,
      sql`select cell_key, value, version from spike_offline.cells order by cell_key`
    )
    return {
      className: SPIKE_CLASS_NAME,
      subjectName: SPIKE_SUBJECT_NAME,
      schoolToday: todayIn(SPIKE_SCHOOL_TIME_ZONE),
      locked: state.sheetLocked,
      students: SPIKE_STUDENTS,
      components: SPIKE_COMPONENTS,
      cells: cells.map((c) => ({
        cellKey: c.cell_key,
        value: c.value,
        version: c.version,
      })),
    }
  })
}

export async function getSpikeSwitches(): Promise<SpikeSwitches> {
  return withTenant(database().db, SPIKE_TENANT_ID, switches)
}

/** Spike only: approve (lock) the sheet, or expire the fake teacher's session. */
export async function setSpikeSwitches(
  change: Partial<SpikeSwitches>
): Promise<SpikeSwitches> {
  return withTenant(database().db, SPIKE_TENANT_ID, async (tx) => {
    const current = await switches(tx)
    const next = { ...current, ...change }
    await tx.execute(sql`
      insert into spike_offline.state (tenant_id, sheet_locked, session_expired)
      values (${SPIKE_TENANT_ID}, ${next.sheetLocked}, ${next.sessionExpired})
      on conflict (tenant_id) do update
        set sheet_locked = excluded.sheet_locked, session_expired = excluded.session_expired`)
    return next
  })
}

function result(
  op: SyncOperation,
  outcome: SyncOutcome,
  value: string | null = null,
  version: number | null = null,
  message: string | null = null
): SyncResult {
  return {
    opId: op.opId,
    outcome,
    cellKey: op.cellKey,
    value,
    version,
    message,
  }
}

async function applyOne(
  tx: TenantTransaction,
  op: SyncOperation
): Promise<SyncResult> {
  // Claim the operation ID first. If it is already there, this is a repeat (for
  // example, the phone never heard the first answer): answer the same, change nothing.
  const claimed = await rows<{ op_id: string }>(
    tx,
    sql`insert into spike_offline.applied_operations (tenant_id, op_id, cell_key, outcome)
        values (${SPIKE_TENANT_ID}, ${op.opId}, ${op.cellKey}, 'pending')
        on conflict (tenant_id, op_id) do nothing
        returning op_id`
  )
  if (claimed.length === 0) {
    const earlier = await rows<{
      cell_key: string
      outcome: SyncOutcome
      result_value: string | null
      result_version: number | null
      message: string | null
    }>(
      tx,
      sql`select cell_key, outcome, result_value, result_version, message
          from spike_offline.applied_operations where op_id = ${op.opId}`
    )
    const first = earlier[0]
    // Refusals stay refusals; anything that was saved is reported as a duplicate.
    const outcome: SyncOutcome =
      first === undefined || first.outcome.startsWith("rejected")
        ? (first?.outcome ?? "duplicate")
        : "duplicate"
    return result(
      op,
      outcome,
      first?.result_value ?? null,
      first?.result_version ?? null,
      first?.message ?? null
    )
  }

  const record = async (r: SyncResult): Promise<SyncResult> => {
    await tx.execute(sql`
      update spike_offline.applied_operations
         set outcome = ${r.outcome}, result_value = ${r.value},
             result_version = ${r.version}, message = ${r.message}
       where op_id = ${op.opId}`)
    return r
  }

  if ((await switches(tx)).sheetLocked) {
    return record(
      result(
        op,
        "rejected_locked",
        null,
        null,
        "This sheet was approved while you were offline, so this change was not saved. Ask the head teacher to unlock it."
      )
    )
  }

  const check = checkCellChange(
    op.cellKey,
    op.value,
    todayIn(SPIKE_SCHOOL_TIME_ZONE)
  )
  if (!check.ok) {
    return record(result(op, "rejected_invalid", null, null, check.message))
  }

  // Lock the cell's row so two phones syncing at once are applied one after the other.
  const current = (
    await rows<{ value: string; version: number; last_device_id: string }>(
      tx,
      sql`select value, version, last_device_id from spike_offline.cells
          where cell_key = ${op.cellKey} for update`
    )
  )[0]

  if (current === undefined) {
    await tx.execute(sql`
      insert into spike_offline.cells
        (tenant_id, cell_key, value, version, last_device_id, last_op_id, updated_by)
      values (${SPIKE_TENANT_ID}, ${op.cellKey}, ${op.value}, 1, ${op.deviceId}, ${op.opId}, ${SPIKE_TEACHER_ID})`)
    return record(result(op, "applied", op.value, 1))
  }

  // Another phone changed the cell since this phone last saw it. The change received
  // later wins (section 20), but the value it replaces is kept for the head teacher.
  // A phone's own earlier edits are never a conflict with itself.
  const conflict =
    current.version !== op.baseVersion && current.last_device_id !== op.deviceId
  if (conflict) {
    await tx.execute(sql`
      insert into spike_offline.conflicts
        (tenant_id, cell_key, overwritten_value, overwritten_version, overwritten_device_id,
         winning_value, winning_op_id, winning_device_id)
      values (${SPIKE_TENANT_ID}, ${op.cellKey}, ${current.value}, ${current.version},
              ${current.last_device_id}, ${op.value}, ${op.opId}, ${op.deviceId})`)
  }

  const version = current.version + 1
  await tx.execute(sql`
    update spike_offline.cells
       set value = ${op.value}, version = ${version}, last_device_id = ${op.deviceId},
           last_op_id = ${op.opId}, updated_by = ${SPIKE_TEACHER_ID}, updated_at = now()
     where cell_key = ${op.cellKey}`)
  return record(
    result(
      op,
      conflict ? "applied_over_conflict" : "applied",
      op.value,
      version
    )
  )
}

/**
 * Applies a phone's queued changes, in the order given, each in its own transaction,
 * so one refused change never undoes the ones before it.
 *
 * @param operations Already validated against `syncRequestSchema`.
 * @returns One result per operation, in the same order.
 */
export async function applySpikeOperations(
  operations: readonly SyncOperation[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  for (const op of operations) {
    results.push(
      await withTenant(database().db, SPIKE_TENANT_ID, (tx) => applyOne(tx, op))
    )
  }
  return results
}

export interface SpikeConflict {
  cellKey: string
  overwrittenValue: string
  winningValue: string
  receivedAt: string
}

/** The values later edits overwrote, newest first, for the head teacher to review. */
export async function listSpikeConflicts(): Promise<SpikeConflict[]> {
  return withTenant(database().db, SPIKE_TENANT_ID, async (tx) => {
    const found = await rows<{
      cell_key: string
      overwritten_value: string
      winning_value: string
      received_at: string
    }>(
      tx,
      // Drizzle returns raw query timestamps as text, not Date objects, so the
      // database formats the moment itself, in UTC, as ISO 8601.
      sql`select cell_key, overwritten_value, winning_value,
                 to_char(received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as received_at
          from spike_offline.conflicts order by conflicts.received_at desc`
    )
    return found.map((c) => ({
      cellKey: c.cell_key,
      overwrittenValue: c.overwritten_value,
      winningValue: c.winning_value,
      receivedAt: c.received_at,
    }))
  })
}
