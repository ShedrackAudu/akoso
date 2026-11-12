import { expect, test, type Page } from "@playwright/test"

import { createApiClient } from "@akoso/api-client"
import { CONTRACTS } from "@akoso/schemas/contracts/index"

import {
  clearSmsOutbox,
  lastCodeSentTo,
  PEOPLE,
  totp,
  waitForCode,
} from "./sign-in-helpers"

// Sign-in, part A (spec: docs/specs/stage-1-sign-in.md, acceptance criteria 1 to 7).
// The people come from packages/db/scripts/seed.mjs; codes come from the fake SMS
// provider's outbox file.

async function parentSignIn(page: Page, phone: string, e164: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Your phone number").fill(phone)
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page.getByRole("status")).toContainText(
    "we have sent a 6-digit code"
  )
  const code = await waitForCode(e164)
  await page.getByLabel("The 6-digit code").fill(code)
  await page.getByRole("button", { name: "Sign in" }).click()
}

async function staffPassword(page: Page, account: string, password: string) {
  await page.goto("/sign-in")
  await page.getByRole("tab", { name: "Staff" }).click()
  await page.getByLabel("Email or phone number").fill(account)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
}

test.beforeEach(() => {
  clearSmsOutbox()
})

test("a parent signs in with a phone code within 60 seconds on slow 3G", async ({
  page,
}) => {
  // Emulate a slow 3G connection (brief section 6's acceptance line).
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  })
  const started = Date.now()
  await parentSignIn(page, PEOPLE.parent.phone, PEOPLE.parent.e164)
  await expect(page).toHaveURL(/\/greenfield$/, { timeout: 60_000 })
  await expect(page.getByTestId("signed-in-as")).toHaveText(
    "Signed in as Parent"
  )
  expect(Date.now() - started).toBeLessThan(60_000)
})

test("an unknown number gets the same answer and no SMS", async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByLabel("Your phone number").fill("0803 999 8877")
  await page.getByRole("button", { name: "Send code" }).click()
  await expect(page.getByRole("status")).toContainText(
    "we have sent a 6-digit code"
  )
  await new Promise((resolve) => setTimeout(resolve, 1_000))
  expect(lastCodeSentTo("+2348039998877")).toBeNull()
})

test("a wrong code is refused, and the third wrong one ends the code", async ({
  page,
}) => {
  await page.goto("/sign-in")
  await page.getByLabel("Your phone number").fill(PEOPLE.parent.phone)
  await page.getByRole("button", { name: "Send code" }).click()
  const code = await waitForCode(PEOPLE.parent.e164)
  const wrong = code === "000000" ? "111111" : "000000"
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByLabel("The 6-digit code").fill(wrong)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByTestId("form-error")).toBeVisible()
  }
  await page.getByLabel("The 6-digit code").fill(code)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByTestId("form-error")).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test("a parent in two schools picks one", async ({ page }) => {
  await parentSignIn(
    page,
    PEOPLE.parentTwoSchools.phone,
    PEOPLE.parentTwoSchools.e164
  )
  await expect(page).toHaveURL(/\/schools$/)
  await expect(
    page.getByRole("link", { name: /Greenfield Academy/ })
  ).toBeVisible()
  await page.getByRole("link", { name: /St Anne's College/ }).click()
  await expect(
    page.getByRole("heading", { name: "St Anne's College" })
  ).toBeVisible()
})

test("a teacher signs in with email or phone and a password", async ({
  page,
}) => {
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
  await expect(page.getByTestId("signed-in-as")).toHaveText(
    "Signed in as Teacher"
  )
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await staffPassword(page, PEOPLE.teacher.phone, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
})

test("a school the person is not in answers 404", async ({ page }) => {
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
  const response = await page.goto("/st-annes")
  expect(response?.status()).toBe(404)
})

test("the session cookie stays on the app address and is HttpOnly", async ({
  page,
  context,
}) => {
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
  const session = (await context.cookies()).find((cookie) =>
    cookie.name.endsWith("akoso.session_token")
  )
  expect(session).toBeDefined()
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe("Lax")
  // Host-only: no leading dot, so no other host (a school's address) receives it.
  expect(session?.domain.startsWith(".")).toBe(false)
})

test("staff whose role needs a second step must set it up, then use it", async ({
  page,
  request,
}) => {
  await staffPassword(page, PEOPLE.bursar.email, PEOPLE.bursar.password)
  // Signed in, but sent to set up the second step, from anywhere.
  await expect(page).toHaveURL(/\/account\/security$/)
  await page.goto("/greenfield")
  await expect(page).toHaveURL(/\/account\/security$/)

  // The server refuses everything else until the second step exists, not just the screen.
  const me = await page.request.get("/api/v1/me")
  expect(me.status()).toBe(403)
  expect(((await me.json()) as { code: string }).code).toBe("mfa_required")

  await page
    .getByLabel("Your password, to confirm")
    .fill(PEOPLE.bursar.password)
  await page.getByRole("button", { name: "Set up authenticator app" }).click()
  const secret = (await page.getByTestId("totp-secret").textContent()) ?? ""
  expect(secret).toMatch(/^[A-Z2-7]+=*$/)
  await page.getByLabel("The 6-digit code your app shows").fill(totp(secret))
  await page.getByRole("button", { name: "Confirm" }).click()
  const codeItems = page.getByTestId("backup-codes").locator("li")
  await expect(codeItems).toHaveCount(10)
  const codes = await codeItems.allTextContents()
  await page.getByRole("button", { name: /I have saved them/ }).click()
  await expect(page).toHaveURL(/\/greenfield$/)
  await expect(page.getByTestId("signed-in-as")).toHaveText(
    "Signed in as Bursar"
  )

  // Next time: password, then the authenticator code.
  await page.getByRole("button", { name: "Sign out" }).click()
  await staffPassword(page, PEOPLE.bursar.email, PEOPLE.bursar.password)
  await page
    .getByLabel("The code from your authenticator app")
    .fill(totp(secret))
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/\/greenfield$/)

  // A backup code works once.
  const backup = codes[0] ?? ""
  for (const expected of ["works", "refused"] as const) {
    await page.context().clearCookies()
    await staffPassword(page, PEOPLE.bursar.email, PEOPLE.bursar.password)
    await page.getByRole("button", { name: "Use a backup code" }).click()
    await page.getByLabel("One of your backup codes").fill(backup)
    await page.getByRole("button", { name: "Continue" }).click()
    if (expected === "works") await expect(page).toHaveURL(/\/greenfield$/)
    else await expect(page.getByTestId("form-error")).toBeVisible()
  }

  // Code sign-in is closed to anyone with a second step (it would skip it).
  clearSmsOutbox()
  const sent = await request.post("/api/auth/phone-number/send-otp", {
    data: { phoneNumber: "+2348031000002" },
  })
  expect(sent.ok()).toBe(true)
  await new Promise((resolve) => setTimeout(resolve, 1_000))
  expect(lastCodeSentTo("+2348031000002")).toBeNull()
})

test("/api/v1/me works with a bearer token, through the typed client", async ({
  request,
  baseURL,
}) => {
  const signIn = await request.post("/api/auth/sign-in/email", {
    data: { email: PEOPLE.teacher.email, password: PEOPLE.teacher.password },
  })
  expect(signIn.ok()).toBe(true)
  const token = signIn.headers()["set-auth-token"] ?? ""
  expect(token).not.toBe("")

  const api = createApiClient(CONTRACTS, {
    baseUrl: baseURL ?? "",
    getToken: () => token,
  })
  const me = await api.getMe({})
  expect(me.name).toContain("Chinedu")
  const schools = await api.listMySchools({})
  expect(schools.data.map((school) => school.slug)).toEqual(["greenfield"])
  expect(schools.data[0]?.roles).toEqual(["teacher"])
})

test("signed-out requests are refused", async ({ request }) => {
  expect((await request.get("/api/v1/me")).status()).toBe(401)
  const page = await request.get("/schools", { maxRedirects: 0 })
  expect([302, 303, 307]).toContain(page.status())
})

test("code requests are limited per phone number", async ({ request }) => {
  const statuses: number[] = []
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await request.post("/api/auth/phone-number/send-otp", {
      data: { phoneNumber: "0803 100 0003" },
    })
    statuses.push(response.status())
  }
  expect(statuses).toEqual([200, 200, 200, 429])
})

test("repeated wrong passwords lock the account for a while", async ({
  request,
}) => {
  const statuses: number[] = []
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await request.post("/api/auth/sign-in/email", {
      data: { email: PEOPLE.proprietor.email, password: "not-the-password" },
    })
    statuses.push(response.status())
  }
  expect(statuses.slice(0, 5).every((status) => status === 401)).toBe(true)
  expect(statuses[5]).toBe(429)
  // Even the right password is refused while locked.
  const locked = await request.post("/api/auth/sign-in/email", {
    data: {
      email: PEOPLE.proprietor.email,
      password: PEOPLE.proprietor.password,
    },
  })
  expect(locked.status()).toBe(429)
})
