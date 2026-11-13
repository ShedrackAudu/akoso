import { execFileSync } from "node:child_process"

import { expect, test, type BrowserContext, type Page } from "@playwright/test"

import { querySqlAsOwner, runSqlAsOwner } from "./global-setup"

// Akoso team sign-in in the admin app (spec: docs/specs/stage-1-sign-in-part-b.md,
// section 8, acceptance criteria 10 to 14), with Chrome's virtual authenticator standing
// in for a phone's fingerprint or face. The tests run in order and share the team.

const ADMIN = "http://localhost:3201"
const WEB = "http://localhost:3200"
const OWNER_EMAIL = "e2e-owner@akoso.test"

test.describe.configure({ mode: "serial" })
test.use({ baseURL: ADMIN })

/** A passkey-capable device for this page: it confirms the user every time. */
async function addAuthenticator(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page)
  await client.send("WebAuthn.enable")
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
}

function inviteOwner(): string {
  const output = execFileSync(
    "pnpm",
    ["-s", "team:invite-owner", OWNER_EMAIL, "E2E Owner"],
    {
      encoding: "utf8",
      shell: true,
      env: { ...process.env, ADMIN_PORT: "3201" },
    }
  )
  const link = /http\S+/.exec(output)?.[0]
  if (link === undefined) throw new Error(`No link in: ${output}`)
  return link
}

let ownerPage: Page
let ownerContext: BrowserContext
let recoveryCodes: string[] = []
let ownerLink = ""

test.beforeAll(async ({ browser }) => {
  // A clean team for this run, and fresh limit counters (recovery codes are limited
  // per email). Audit records stay: the chain is append-only.
  runSqlAsOwner(`
    delete from platform.team_security_events;
    delete from platform.team_recovery_codes;
    delete from platform.team_invitations;
    delete from platform.team_role_grants;
    delete from platform.team_passkeys;
    delete from platform.team_sessions;
    delete from platform.team_verifications;
    delete from platform.team_users;
    delete from platform.rate_limit_windows;`)
  ownerContext = await browser.newContext({ baseURL: ADMIN })
  ownerPage = await ownerContext.newPage()
  await addAuthenticator(ownerPage)
})

test.afterAll(async () => {
  await ownerContext.close()
})

test("the first Owner enrols with a passkey from the command line's link", async () => {
  ownerLink = inviteOwner()
  // The command refuses a second Owner.
  expect(() => inviteOwner()).toThrow()

  await ownerPage.goto(new URL(ownerLink).pathname + new URL(ownerLink).search)
  await ownerPage.getByRole("button", { name: "Create your passkey" }).click()
  const codes = ownerPage.getByTestId("recovery-codes").locator("li")
  await expect(codes).toHaveCount(10)
  recoveryCodes = await codes.allTextContents()
  await ownerPage.getByRole("button", { name: /I've saved them/ }).click()
  await expect(ownerPage.getByTestId("signed-in-as")).toContainText("Owner")

  // The link works once.
  const second = await ownerContext.newPage()
  await second.goto(new URL(ownerLink).pathname + new URL(ownerLink).search)
  await addAuthenticator(second)
  await second.getByRole("button", { name: "Create your passkey" }).click()
  await expect(second.getByTestId("form-error")).toContainText("doesn't work")
  await second.close()
})

test("the Owner signs out and back in with the passkey", async () => {
  await ownerPage.getByRole("button", { name: "Sign out" }).click()
  await expect(ownerPage).toHaveURL(/\/sign-in$/)
  await ownerPage
    .getByRole("button", { name: "Sign in with your passkey" })
    .click()
  await expect(ownerPage.getByTestId("signed-in-as")).toContainText("Owner")
})

test("the Owner invites Support; removing them ends their access at once", async ({
  browser,
}) => {
  await ownerPage.goto("/team")
  const email = `e2e-support-${String(Date.now())}@akoso.test`
  await ownerPage.getByLabel("Name").fill("E2E Support")
  await ownerPage.getByLabel("Email").fill(email)
  await ownerPage.getByRole("checkbox", { name: "Support" }).check()
  await ownerPage.getByRole("button", { name: "Make invitation link" }).click()
  const link =
    (await ownerPage.getByTestId("invitation-link").textContent()) ?? ""

  const supportContext = await browser.newContext({ baseURL: ADMIN })
  const support = await supportContext.newPage()
  await addAuthenticator(support)
  await support.goto(new URL(link).pathname + new URL(link).search)
  await support.getByRole("button", { name: "Create your passkey" }).click()
  await support.getByRole("button", { name: /I've saved them/ }).click()
  await expect(support.getByTestId("signed-in-as")).toContainText("Support")
  // Support may not manage the team.
  const teamPage = await support.goto("/team")
  expect(teamPage?.status()).toBe(404)

  // Separation: the team session means nothing to the school app.
  const cookies = await supportContext.cookies(ADMIN)
  const header = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")
  const me = await support.request.get(`${WEB}/api/v1/me`, {
    headers: { cookie: header },
  })
  expect(me.status()).toBe(401)

  await ownerPage.reload()
  await ownerPage
    .getByTestId("team-member-row")
    .filter({ hasText: email })
    .click()
  await ownerPage.getByRole("button", { name: "Remove access now" }).click()
  await expect(ownerPage.getByTestId("team-notice")).toContainText(
    "Access removed"
  )
  await support.goto("/")
  await expect(support).toHaveURL(/\/sign-in$/)
  const left = querySqlAsOwner(`
    select count(*) from platform.team_passkeys p
    join platform.team_users u on u.id = p.user_id where u.email = '${email}'`)
  expect(left[0]?.[0]).toBe("0")
  await supportContext.close()
})

test("a school session gets nothing from the admin app", async ({ page }) => {
  const session = await page.request.get(`${ADMIN}/api/auth/get-session`, {
    headers: { cookie: "akoso.session_token=not-a-team-session" },
  })
  expect(await session.text()).toBe("null")
  const home = await page.goto("/")
  await expect(page).toHaveURL(/\/sign-in$/)
  expect(home?.ok()).toBe(true)
})

test("a recovery code works once and asks for a new passkey", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: ADMIN })
  const page = await context.newPage()
  await addAuthenticator(page)
  await page.goto("/recover")
  await page.getByLabel("Your email").fill(OWNER_EMAIL)
  await page
    .getByLabel("One of your recovery codes")
    .fill(recoveryCodes[0] ?? "")
  await page
    .getByRole("button", { name: "Use code and create a new passkey" })
    .click()
  await expect(page).toHaveURL(/\/security\?recovered=1$/)
  await expect(page.getByTestId("codes-left")).toHaveText("9 of 10 unused.")

  // The Owner sees that a code was used.
  await page.goto("/")
  await expect(page.getByTestId("recovery-alert")).toContainText("E2E Owner")
  await context.close()

  // The same code again is refused.
  const again = await browser.newContext({ baseURL: ADMIN })
  const retry = await again.newPage()
  await retry.goto("/recover")
  await retry.getByLabel("Your email").fill(OWNER_EMAIL)
  await retry
    .getByLabel("One of your recovery codes")
    .fill(recoveryCodes[0] ?? "")
  await retry
    .getByRole("button", { name: "Use code and create a new passkey" })
    .click()
  await expect(retry.getByTestId("form-error")).toContainText("isn't right")
  await again.close()
})

test("a session ends after 30 idle minutes", async () => {
  runSqlAsOwner(`
    update platform.team_sessions set updated_at = now() - interval '40 minutes'
    where user_id = (select id from platform.team_users where email = '${OWNER_EMAIL}');`)
  await ownerPage.goto("/")
  await expect(ownerPage).toHaveURL(/\/sign-in$/)
})
