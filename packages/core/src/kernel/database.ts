// The application's database pool: one per process, opened on first use with the
// least-privilege app role, through the pooler (DATABASE_URL).
import { createDatabase, type Database, type DatabaseHandle } from "@akoso/db"

import { loadEnv } from "../config/index"

let handle: DatabaseHandle | undefined

export function getDatabase(): Database {
  handle ??= createDatabase(loadEnv(process.env).DATABASE_URL)
  return handle.db
}

/** Closes the pool. For tests and graceful shutdown. */
export async function closeDatabase(): Promise<void> {
  const current = handle
  handle = undefined
  await current?.close()
}
