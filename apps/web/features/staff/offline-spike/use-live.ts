"use client"

// Spike 02. Re-renders when the IndexedDB data a screen reads changes.
import { liveQuery } from "dexie"
import { useEffect, useState, useSyncExternalStore } from "react"

import {
  getConnection,
  subscribeConnection,
  type ConnectionState,
} from "./sync-engine"

export function useLive<T>(query: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (error: unknown) => {
        console.error("Reading this phone's saved data failed", error)
      },
    })
    return () => {
      subscription.unsubscribe()
    }
    // The query is defined once per screen; re-subscribing on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return value
}

const SERVER_CONNECTION: ConnectionState = { online: true, syncing: false }

export function useConnection(): ConnectionState {
  return useSyncExternalStore(
    subscribeConnection,
    getConnection,
    () => SERVER_CONNECTION
  )
}
