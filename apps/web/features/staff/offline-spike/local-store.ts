// Spike 02. What the phone keeps in IndexedDB: the sheet as last downloaded, each
// cell's last known server value and version, and the queue of unsent changes.
import Dexie, { type Table } from "dexie"

export interface StoredSheet {
  id: "current"
  className: string
  subjectName: string
  schoolToday: string
  locked: boolean
  students: { id: string; name: string }[]
  components: { key: string; label: string; maximum: number }[]
}

export interface StoredCell {
  cellKey: string
  value: string
  version: number
}

type QueuedStatus = "pending" | "rejected"

export interface QueuedChange {
  /** Order of entry on this phone. Changes are sent in this order. */
  seq?: number
  opId: string
  cellKey: string
  value: string
  baseVersion: number
  status: QueuedStatus
  /** Why the server refused it, for a rejected change. */
  message: string | null
}

export interface MetaRow {
  key: "deviceId" | "needsSignIn" | "signedOut"
  value: string
}

class OfflineSpikeStore extends Dexie {
  sheet!: Table<StoredSheet, string>
  cells!: Table<StoredCell, string>
  queue!: Table<QueuedChange, number>
  meta!: Table<MetaRow, string>

  constructor() {
    super("akoso-spike-offline")
    this.version(1).stores({
      sheet: "id",
      cells: "cellKey",
      queue: "++seq, &opId, cellKey, status",
      meta: "key",
    })
  }
}

export const store = new OfflineSpikeStore()

export async function getMeta(
  key: MetaRow["key"]
): Promise<string | undefined> {
  return (await store.meta.get(key))?.value
}

export async function setMeta(
  key: MetaRow["key"],
  value: string
): Promise<void> {
  await store.meta.put({ key, value })
}

/** This phone's ID, made once and kept. Sent with every change. */
export async function deviceId(): Promise<string> {
  const existing = await getMeta("deviceId")
  if (existing !== undefined) {
    return existing
  }
  const made = crypto.randomUUID()
  await setMeta("deviceId", made)
  return made
}
