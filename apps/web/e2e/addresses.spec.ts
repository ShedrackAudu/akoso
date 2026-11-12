import { expect, test } from "@playwright/test"

// The request proxy (spec: docs/specs/stage-1-tenancy.md, section 4, acceptance 4).
// The app runs with APP_BASE_DOMAIN=akoso.localhost; plain localhost counts as the app
// address, and school addresses are reached by sending their Host header. The schools
// come from packages/db/scripts/seed.mjs.
const at = (host: string) => ({ headers: { host } })

test("the app address serves the app", async ({ request }) => {
  expect((await request.get("/")).status()).toBe(200)
  expect((await request.get("/api/v1/health")).status()).toBe(200)
})

const refused: [string, string][] = [
  ["an IP address", "203.0.113.7"],
  ["another domain", "evil.example"],
  ["the admin address", "admin.akoso.localhost"],
  ["a reserved name", "api.akoso.localhost"],
  ["an unknown school", "no-such-school.akoso.localhost"],
  ["a closed school", "pioneer-closed.akoso.localhost"],
]
for (const [label, host] of refused) {
  test(`refuses ${label} with 404`, async ({ request }) => {
    expect((await request.get("/", at(host))).status()).toBe(404)
  })
}

test("a school's address shows its public page, with no cookies", async ({
  request,
}) => {
  const response = await request.get("/", at("greenfield.akoso.localhost:3200"))
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain("Greenfield Academy")
  expect(html).toContain("http://app.akoso.localhost:3200/greenfield/sign-in")
  expect(response.headers()["set-cookie"]).toBeUndefined()
})

test("a school's address serves no app routes and no API", async ({
  request,
}) => {
  const host = at("greenfield.akoso.localhost")
  for (const path of [
    "/api/v1/health",
    "/spike/offline",
    "/~offline",
    "/fees",
  ]) {
    expect((await request.get(path, host)).status(), path).toBe(404)
  }
})

test("a suspended school's page says it is unavailable", async ({
  request,
}) => {
  const response = await request.get("/", at("harmony-paused.akoso.localhost"))
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain("temporarily unavailable")
})

test("school pages cannot be reached on the app address", async ({
  request,
}) => {
  expect((await request.get("/school-site/greenfield")).status()).toBe(404)
})

test("a school's page registers no service worker", async ({ page }) => {
  await page.goto("http://greenfield.akoso.localhost:3200/")
  await expect(
    page.getByRole("heading", { name: "Greenfield Academy" })
  ).toBeVisible()
  const workers = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length
  )
  expect(workers).toBe(0)
})
