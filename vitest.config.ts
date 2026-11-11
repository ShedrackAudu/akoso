import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.{ts,tsx}", "apps/*/**/*.test.{ts,tsx}"],
    // Database tests need Docker; they run with `pnpm test:db` (vitest.db.config.ts).
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/*.db.test.ts",
    ],
    passWithNoTests: false,
  },
})
