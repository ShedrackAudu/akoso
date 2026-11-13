import { execFileSync } from "node:child_process"
import { randomInt, randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

import { runSqlAsOwner } from "./global-setup"
import {
  clearSmsOutbox,
  lastCodeSentTo,
  PEOPLE,
  totp,
  waitForCode,
  waitForEmail,
} from "./sign-in-helpers"

// Sign-in part B, the school side (spec: docs/specs/stage-1-sign-in-part-b.md,
// acceptance criteria 1, 4, 6, 8 and 9 through the screens). The people come from
// packages/db/scripts/seed.mjs. These tests change seeded people, so the seed runs
// again afterwards and the other test files start from the same state.

const PROPRIETOR_ID = "7a000000-0000-4000-8000-000000000001"
const TEACHER_ID = "7a000000-0000-4000-8000-000000000003"

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
  // Wait for sign-in to finish before going anywhere else.
  await expect(page).not.toHaveURL(/\/sign-in$/)
}

/** The proprietor signs in, setting up the second step the seed removed. */
async function proprietorSignIn(page: Page): Promise<string> {
  await staffPassword(page, PEOPLE.proprietor.email, PEOPLE.proprietor.password)
  await expect(page).toHaveURL(/\/account\/security$/)
  await page
    .getByLabel("Your password, to confirm")
    .fill(PEOPLE.proprietor.password)
  await page.getByRole("button", { name: "Set up authenticator app" }).click()
  const secret = (await page.getByTestId("totp-secret").textContent()) ?? ""
  await page.getByLabel("The 6-digit code your app shows").fill(totp(secret))
  await page.getByRole("button", { name: "Confirm" }).click()
  await page.getByRole("button", { name: /I have saved them/ }).click()
  await expect(page).toHaveURL(/\/greenfield$/)
  return secret
}

test.beforeEach(() => {
  clearSmsOutbox()
})

test.afterAll(() => {
  execFileSync("pnpm", ["-s", "db:seed"], { stdio: "inherit", shell: true })
  runSqlAsOwner("delete from platform.rate_limit_windows;")
})

test("the proprietor changes a teacher's roles, and it shows in the security log", async ({
  page,
  browser,
}) => {
  const secret = await proprietorSignIn(page)
  await page.getByRole("link", { name: "School settings" }).click()
  await expect(page).toHaveURL(/\/greenfield\/settings\/team$/)
  await page
    .getByTestId("member-row")
    .filter({ hasText: "Chinedu Eze" })
    .click()
  await page.getByRole("checkbox", { name: "Head teacher" }).check()
  await page.getByRole("checkbox", { name: "Exams officer" }).check()
  await page.getByRole("button", { name: "Save roles" }).click()
  await expect(page.getByTestId("member-notice")).toContainText("Roles saved")

  // The teacher now has both roles, and the Exams officer's permission to see who
  // has access.
  const teacher = await browser.newPage()
  await staffPassword(teacher, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(teacher).toHaveURL(/\/greenfield$/)
  await expect(teacher.getByTestId("signed-in-as")).toHaveText(
    "Signed in as Head teacher, Teacher"
  )
  await teacher.getByRole("link", { name: "School settings" }).click()
  await expect(teacher.getByTestId("member-row").first()).toBeVisible()
  // ...but not to change anyone's roles.
  await teacher
    .getByTestId("member-row")
    .filter({ hasText: "Bola Adeyemi" })
    .click()
  await expect(teacher.getByRole("button", { name: "Save roles" })).toHaveCount(
    0
  )
  await teacher.close()

  // A risky change after a while asks the proprietor to confirm it's them.
  runSqlAsOwner(
    `update platform.sessions set created_at = now() - interval '1 hour'
     where user_id = '${PROPRIETOR_ID}';`
  )
  await page.reload()
  await page.getByRole("checkbox", { name: "Head teacher" }).uncheck()
  await page.getByRole("button", { name: "Save roles" }).click()
  const confirm = page.getByTestId("confirm-identity")
  await confirm.getByLabel("Password").fill(PEOPLE.proprietor.password)
  await confirm.getByRole("button", { name: "Confirm" }).click()
  await confirm
    .getByLabel(/Code from your authenticator app/)
    .fill(totp(secret, Date.now() + 30_000))
  await confirm.getByRole("button", { name: "Confirm" }).click()
  await expect(page.getByTestId("member-notice")).toContainText("Roles saved")

  // The security log shows it, and the access review lists the proprietor.
  await page.getByRole("link", { name: "Security log" }).click()
  await expect(
    page
      .getByTestId("security-log-entry")
      .filter({ hasText: "Roles changed by the school" })
      .first()
  ).toBeVisible()
  await expect(
    page.getByTestId("access-review-row").filter({ hasText: "Adaeze Okafor" })
  ).toContainText("Second step on")
  const csv = await page.request.get(
    "/greenfield/settings/security/access-review"
  )
  expect(csv.headers()["content-type"]).toContain("text/csv")
  expect(await csv.text()).toContain("Adaeze Okafor")
})

test("pages need their permission: a teacher gets 404 for the security log", async ({
  page,
}) => {
  runSqlAsOwner(
    `update platform.memberships set roles = array['teacher'] where user_id = '${TEACHER_ID}';
     delete from platform.membership_custom_roles where membership_id in
       (select id from platform.memberships where user_id = '${TEACHER_ID}');`
  )
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
  const response = await page.goto("/greenfield/settings/security")
  expect(response?.status()).toBe(404)
})

test("a parent signs in with their backup number", async ({ page }) => {
  await parentSignIn(page, "0803 100 0113", "+2348031000113")
  await expect(page).toHaveURL(/\/greenfield$/)
  await page.goto("/account")
  await expect(page.getByTestId("backup-phone")).toHaveText("+2348031000113")
})

test("a suspended teacher can't use the school", async ({ page }) => {
  await staffPassword(
    page,
    "suspended-teacher@greenfield.test",
    "Greenfield-suspended-local"
  )
  const response = await page.goto("/greenfield")
  expect(response?.status()).toBe(404)
})

test("a teacher confirms a new email from the link", async ({ page }) => {
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await page.goto("/account")
  const address = `teacher-${String(Date.now())}@greenfield.test`
  await page.getByLabel("New email").fill(address)
  await page.getByRole("button", { name: "Send confirmation link" }).click()
  await expect(page.getByTestId("account-notice")).toContainText(address)
  const link = /https?:\/\/\S+/.exec(await waitForEmail(address))?.[0] ?? ""
  const path = new URL(link).pathname + new URL(link).search
  await page.goto(path)
  await expect(page.getByTestId("email-confirm-result")).toContainText(
    "sign in with your new email"
  )
  // The link works once.
  await page.goto(path)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This link doesn't work"
  )
})

test("a parent deletes their account and can't sign in again", async ({
  page,
  request,
}) => {
  const id = randomUUID()
  const phone = `+234803${String(randomInt(1_000_000, 9_999_999))}`
  runSqlAsOwner(
    `insert into platform.users (id, name, email, phone_number, phone_number_verified)
     values ('${id}', 'Leaving Parent', '${id}@phone-only.akoso.invalid', '${phone}', true);
     insert into platform.memberships (tenant_id, user_id, roles)
     values ('9a000000-0000-4000-8000-000000000001', '${id}', array['guardian']);`
  )
  await parentSignIn(page, phone, phone)
  await expect(page).toHaveURL(/\/greenfield$/)
  await page.goto("/account")
  await page.getByRole("checkbox", { name: /can't be undone/ }).check()
  await page.getByRole("button", { name: "Delete my account" }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  clearSmsOutbox()
  const sent = await request.post("/api/auth/phone-number/send-otp", {
    data: { phoneNumber: phone },
  })
  expect(sent.status(), await sent.text()).toBe(200)
  await new Promise((resolve) => setTimeout(resolve, 1_000))
  expect(lastCodeSentTo(phone)).toBeNull()
})
