// Applies pending migrations, as the migration role, straight to Postgres (never through
// the pooler). `pnpm db:migrate` locally; the pre-deploy step on staging and production.
//
// DATABASE_MIGRATOR_URL names the migration role's connection. Locally it defaults to
// the value in docker-compose.yml and docker/postgres/init/01-roles.sql.
import { fileURLToPath, pathToFileURL } from "node:url"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

const LOCAL_MIGRATOR_URL =
  "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev"

/**
 * @param {string} connectionString The migration role's connection.
 */
export async function runMigrations(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 1 })
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(
        new URL("../migrations", import.meta.url)
      ),
      // The migration role owns the platform schema and may not create schemas.
      migrationsSchema: "platform",
      migrationsTable: "__drizzle_migrations",
    })
  } finally {
    await pool.end()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = process.env.DATABASE_MIGRATOR_URL ?? LOCAL_MIGRATOR_URL
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.DATABASE_MIGRATOR_URL
  ) {
    console.error("DATABASE_MIGRATOR_URL is not set")
    process.exit(1)
  }
  await runMigrations(url)
  console.log("Migrations applied")
}
