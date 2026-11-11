import { defineConfig, devices } from "@playwright/test"

// End-to-end tests in a real browser (brief section 30). They need Docker running
// (`docker compose up -d`). Run with `pnpm test:e2e`.
const PORT = 3200

// Local values matching docker-compose.yml; not secrets. CI sets the same.
const serverEnv = {
  NODE_ENV: "production",
  APP_BASE_DOMAIN: "akoso.localhost",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev",
}

export default defineConfig({
  testDir: "apps/web/e2e",
  globalSetup: "./apps/web/e2e/global-setup.ts",
  // The tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI === undefined ? "list" : [["list"], ["github"]],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    // A mid-range Android phone's screen.
    ...devices["Pixel 5"],
    trace: "retain-on-failure",
  },
  webServer: {
    // The service worker only exists in a production build.
    command: `pnpm --filter @akoso/web build && pnpm --filter @akoso/web start --port ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/spike/offline`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: serverEnv,
  },
})
