import { defineConfig } from "vitest/config"

// Tests that need the local Postgres and PgBouncer from docker-compose.yml.
// Run with `pnpm test:db` after `docker compose up -d`.
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.db.test.ts"],
    globalSetup: ["./packages/db/scripts/vitest-global-setup.mjs"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    // The files share one database, so they run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
