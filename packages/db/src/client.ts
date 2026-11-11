import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

export type Database = NodePgDatabase

/** A transaction handed to work running inside `withTenant()`. */
export type TenantTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0]

export interface DatabaseHandle {
  db: Database
  pool: Pool
  /** Closes every connection. Call once, on shutdown. */
  close: () => Promise<void>
}

/**
 * Opens a connection pool and wraps it in Drizzle.
 *
 * @param connectionString The application role's connection. In every environment
 *   this goes through the connection pooler, never straight to Postgres.
 * @param maxConnections The most connections this process holds at once.
 */
export function createDatabase(
  connectionString: string,
  maxConnections = 10
): DatabaseHandle {
  const pool = new Pool({ connectionString, max: maxConnections })
  return {
    db: drizzle(pool),
    pool,
    close: () => pool.end(),
  }
}
