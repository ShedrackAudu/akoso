// drizzle-kit generates migration SQL from the schema files. It never connects to a
// database here: migrations are applied by scripts/migrate.mjs, as the migration role.
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/*.ts",
  out: "./migrations",
  schemaFilter: ["public", "platform", "school_setup"],
  casing: "snake_case",
})
