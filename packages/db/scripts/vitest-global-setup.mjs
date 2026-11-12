// Database tests always run against the current schema and the seeded test schools:
// apply pending migrations, then seed, once, before any test file starts.
import { runMigrations } from "./migrate.mjs"
import { seed } from "./seed.mjs"

export default async function setup() {
  const url =
    process.env.DATABASE_MIGRATOR_URL ??
    "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev"
  await runMigrations(url)
  await seed(url)
}
