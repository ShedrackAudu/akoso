// Spike 02. Saving changes on the phone first, then sending them to the school in
// order, exactly once, whenever a connection allows (brief section 20).
import {
  SYNC_BATCH_LIMIT,
  syncResponseSchema,
  type SyncOperation,
} from "@akoso/schemas/offline-sync"

import {
  deviceId,
  getMeta,
  setMeta,
  store,
  type StoredSheet,
} from "./local-store"

const SHEET_URL = "/api/spike/offline/sheet"
const SYNC_URL = "/api/spike/offline/sync"

// "Online" means our last request to the school worked, not what the browser claims;
// the browser's online flag is often wrong on weak mobile networks.
export interface ConnectionState {
  online: boolean
  syncing: boolean
}

let connection: ConnectionState = { online: true, syncing: false }
const listeners = new Set<() => void>()

function setConnection(change: Partial<ConnectionState>): void {
  connection = { ...connection, ...change }
  listeners.forEach((listener) => {
    listener()
  })
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getConnection(): ConnectionState {
  return connection
}

// Changes sent but not yet answered. Kept in memory only: if the page dies mid-send,
// they are simply sent again, and the server recognises the repeat.
const inFlight = new Set<string>()

/** Downloads the sheet so the phone can work offline. Keeps the old copy if it fails. */
export async function refreshSheet(): Promise<"ok" | "offline" | "signed_out"> {
  let response: Response
  try {
    response = await fetch(SHEET_URL, { cache: "no-store" })
  } catch {
    setConnection({ online: false })
    return "offline"
  }
  if (response.status === 401) {
    await setMeta("needsSignIn", "true")
    setConnection({ online: true })
    return "signed_out"
  }
  if (!response.ok) {
    setConnection({ online: false })
    return "offline"
  }
  const sheet = (await response.json()) as Omit<StoredSheet, "id"> & {
    cells: { cellKey: string; value: string; version: number }[]
  }
  await store.transaction("rw", store.sheet, store.cells, async () => {
    const { cells, ...rest } = sheet
    await store.sheet.put({ id: "current", ...rest })
    for (const cell of cells) {
      const known = await store.cells.get(cell.cellKey)
      if (known === undefined || known.version < cell.version) {
        await store.cells.put(cell)
      }
    }
  })
  await setMeta("needsSignIn", "false")
  setConnection({ online: true })
  return "ok"
}

/**
 * Saves one change on the phone. It goes into the queue first and is sent later.
 * A change to a cell that already has an unsent change replaces that change's value,
 * unless it is being sent right now.
 */
export async function recordChange(
  cellKey: string,
  value: string
): Promise<void> {
  await store.transaction("rw", store.queue, store.cells, async () => {
    const waiting = await store.queue
      .where("cellKey")
      .equals(cellKey)
      .filter((c) => c.status === "pending" && !inFlight.has(c.opId))
      .last()
    if (waiting?.seq !== undefined) {
      await store.queue.update(waiting.seq, { value })
      return
    }
    const known = await store.cells.get(cellKey)
    await store.queue.add({
      opId: crypto.randomUUID(),
      cellKey,
      value,
      baseVersion: known?.version ?? 0,
      status: "pending",
      message: null,
    })
  })
}

let running: Promise<void> | null = null

/** Sends every waiting change, in order. Safe to call often; only one send runs at a time. */
export function syncNow(): Promise<void> {
  running ??= sendAll().finally(() => {
    running = null
  })
  return running
}

async function sendAll(): Promise<void> {
  if ((await getMeta("needsSignIn")) === "true") {
    return
  }
  const device = await deviceId()
  setConnection({ syncing: true })
  try {
    for (;;) {
      const batch = await store.queue
        .where("status")
        .equals("pending")
        .limit(SYNC_BATCH_LIMIT)
        .sortBy("seq")
      if (batch.length === 0) {
        return
      }
      const operations: SyncOperation[] = batch.map((c) => ({
        opId: c.opId,
        deviceId: device,
        cellKey: c.cellKey,
        value: c.value,
        baseVersion: c.baseVersion,
      }))
      if (!(await sendBatch(operations))) {
        return
      }
    }
  } finally {
    setConnection({ syncing: false })
  }
}

async function sendBatch(operations: SyncOperation[]): Promise<boolean> {
  operations.forEach((op) => inFlight.add(op.opId))
  try {
    let response: Response
    try {
      response = await fetch(SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      })
    } catch {
      setConnection({ online: false })
      return false
    }
    if (response.status === 401) {
      // The session expired. Keep everything; ask the teacher to sign in again.
      await setMeta("needsSignIn", "true")
      setConnection({ online: true })
      return false
    }
    if (!response.ok) {
      setConnection({ online: false })
      return false
    }
    const parsed = syncResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      return false
    }
    setConnection({ online: true })
    await store.transaction("rw", store.queue, store.cells, async () => {
      for (const r of parsed.data.results) {
        const queued = await store.queue.where("opId").equals(r.opId).first()
        if (queued?.seq === undefined) {
          continue
        }
        if (
          r.outcome === "rejected_locked" ||
          r.outcome === "rejected_invalid"
        ) {
          // Never dropped: kept and shown until the teacher deals with it.
          await store.queue.update(queued.seq, {
            status: "rejected",
            message: r.message,
          })
          continue
        }
        await store.queue.delete(queued.seq)
        if (r.value !== null && r.version !== null) {
          const known = await store.cells.get(r.cellKey)
          if (known === undefined || known.version < r.version) {
            await store.cells.put({
              cellKey: r.cellKey,
              value: r.value,
              version: r.version,
            })
          }
        }
      }
    })
    return true
  } finally {
    operations.forEach((op) => inFlight.delete(op.opId))
  }
}

/** Drops one refused change, after the teacher confirms. */
export async function discardRejected(seq: number): Promise<void> {
  await store.queue.delete(seq)
}

/**
 * Sign-out (decision D-9): try to send everything first. If anything is still waiting,
 * report how many, and clear nothing until the teacher confirms.
 */
export async function trySignOut(): Promise<{ unsent: number }> {
  await syncNow()
  const unsent = await store.queue.count()
  if (unsent === 0) {
    await clearAndSignOut()
  }
  return { unsent }
}

/** Clears everything this teacher's phone holds. Only after confirmation. */
export async function clearAndSignOut(): Promise<void> {
  await store.transaction(
    "rw",
    store.sheet,
    store.cells,
    store.queue,
    async () => {
      await store.sheet.clear()
      await store.cells.clear()
      await store.queue.clear()
    }
  )
  await setMeta("signedOut", "true")
}

export async function signIn(): Promise<void> {
  await setMeta("signedOut", "false")
  await setMeta("needsSignIn", "false")
  await refreshSheet()
  await syncNow()
}
