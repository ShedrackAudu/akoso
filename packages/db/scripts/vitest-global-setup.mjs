// Database tests always run against the current schema: apply pending migrations once,
// before any test file starts.
import { runMigrations } from "./migrate.mjs"

export default async function setup() {
  await runMigrations(
    process.env.DATABASE_MIGRATOR_URL ??
      "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev"
  )
}
