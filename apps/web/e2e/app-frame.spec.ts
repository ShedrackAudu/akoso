import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { runSqlAsOwner } from "./global-setup"
import {
  clearSmsOutbox,
  expectSignedInAs,
  PEOPLE,
  totp,
  waitForCode,
} from "./sign-in-helpers"

// The app frame (spec: docs/specs/stage-2-app-frame.md, acceptance criteria 1 to 8 and
// 10). Screenshots for the founder's review go to test-results/app-frame/.

const SHOTS = join("test-results", "app-frame")
const TEACHER_ID = "7a000000-0000-4000-8000-000000000003"
const PHONE = { width: 375, height: 812 }
const COMPUTER = { width: 1280, height: 800 }

test.describe.configure({ mode: "serial" })

test.beforeEach(() => {
  clearSmsOutbox()
})

// These tests set up a second step and change roles; the seed puts everything back.
test.afterAll(() => {
  execFileSync("pnpm", ["-s", "db:seed"], { stdio: "inherit", shell: true })
  runSqlAsOwner("delete from platform.rate_limit_windows;")
})

async function staffPassword(page: Page, account: string, password: string) {
  await page.goto("/sign-in")
  await page.getByRole("tab", { name: "Staff" }).click()
  await page.getByLabel("Email or phone number").fill(account)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).not.toHaveURL(/\/sign-in$/)
}

async function parentSignIn(page: Page, phone: string, e164: string) {
  await page.goto("/sign-in")
  await page.getByLabel("Your phone number").fill(phone)
  await page.getByRole("button", { name: "Send code" }).click()
  await page.getByLabel("The 6-digit code").fill(await waitForCode(e164))
  await page.getByRole("button", { name: "Sign in" }).click()
}

/** The proprietor signs in, setting up the second step the seed removed. */
async function proprietorSignIn(page: Page): Promise<void> {
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
}

/** No accessibility violations, in light and in dark. */
async function expectAccessible(page: Page, label: string): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    const results = await new AxeBuilder({ page })
      // The development badge and the route announcer are Next's, not ours.
      .exclude("nextjs-portal")
      .analyze()
    expect(
      results.violations.map(
        (v) =>
          `${label} (${scheme}): ${v.id}: ${v.help} at ${v.nodes
            .map(
              (node) =>
                `${node.target.join(" ")} [${node.failureSummary ?? ""}]`
            )
            .join("; ")}`
      )
    ).toEqual([])
  }
  await page.emulateMedia({ colorScheme: "light" })
}

async function shoot(page: Page, name: string): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.screenshot({ path: join(SHOTS, `${name}-${scheme}.png`) })
  }
  await page.emulateMedia({ colorScheme: "light" })
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test("the proprietor's frame: settings by role, on a phone and a computer", async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await proprietorSignIn(page)

  // Phone: the bottom bar, with Settings leading to its first page.
  const bar = page.getByTestId("bottom-bar")
  await expect(bar.getByRole("link", { name: "Home" })).toBeVisible()
  await expect(bar.getByRole("link", { name: "Settings" })).toBeVisible()
  for (const target of await bar.getByRole("link").all()) {
    const box = await target.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await expectNoSidewaysScroll(page)
  await shoot(page, "staff-home-phone")
  await expectAccessible(page, "staff home")

  // More holds everything, including the settings pages and my account.
  await bar.getByRole("button", { name: "More" }).click()
  const more = page.getByRole("dialog")
  for (const name of [
    "People with access",
    "Roles",
    "Security log",
    "My account",
  ]) {
    await expect(more.getByRole("link", { name })).toBeVisible()
  }
  await shoot(page, "staff-more-phone")
  await more.getByRole("link", { name: "People with access" }).click()
  await expect(page).toHaveURL(/\/greenfield\/settings\/team$/)
  await expectNoSidewaysScroll(page)
  await shoot(page, "staff-team-phone")
  await expectAccessible(page, "people with access")

  // Computer: the sidebar, showing Settings' pages, which collapses to icons.
  await page.setViewportSize(COMPUTER)
  const sidebar = page.getByTestId("sidebar")
  await expect(sidebar).toBeVisible()
  await expect(page.getByTestId("bottom-bar")).toBeHidden()
  for (const name of [
    "Home",
    "Settings",
    "People with access",
    "Roles",
    "Security log",
  ]) {
    await expect(sidebar.getByRole("link", { name })).toBeVisible()
  }
  await expect(
    sidebar.getByRole("link", { name: "People with access" })
  ).toHaveAttribute("aria-current", "page")
  await shoot(page, "staff-team-computer")
  await sidebar.getByRole("button", { name: "Collapse the menu" }).click()
  await expect(sidebar).toHaveAttribute("data-collapsed", "true")
  await shoot(page, "staff-team-computer-collapsed")
  await sidebar.getByRole("button", { name: "Expand the menu" }).click()
  await expect(sidebar).toHaveAttribute("data-collapsed", "false")

  // The account menu, and every other framed page.
  await expectSignedInAs(page, "Proprietor")
  for (const path of [
    "/greenfield/settings/roles",
    "/greenfield/settings/security",
    "/account",
  ]) {
    await page.goto(path)
    await expectAccessible(page, path)
  }
  await shoot(page, "account-computer")

  // Skip to content works by keyboard.
  await page.goto("/greenfield")
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("link", { name: "Skip to content" })
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#main")).toBeFocused()
})

test("a teacher sees no settings, and a teacher who is also a parent switches views", async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await expect(page).toHaveURL(/\/greenfield$/)
  const bar = page.getByTestId("bottom-bar")
  await expect(bar.getByRole("link", { name: "Home" })).toBeVisible()
  await expect(bar.getByRole("link", { name: "Settings" })).toHaveCount(0)
  await expect(page.getByTestId("empty-state")).toBeVisible()

  // Now also a parent at Greenfield.
  runSqlAsOwner(`
    update platform.memberships set roles = array['teacher', 'guardian']
    where user_id = '${TEACHER_ID}';`)
  await page.reload()
  await page.getByTestId("account-menu").click()
  await page.getByRole("menuitem", { name: "Switch to parent view" }).click()
  await expect(page).toHaveURL(/\/greenfield\/parent$/)
  // The parent view is the light frame: no account menu, everything in More.
  await expect(page.getByTestId("account-link")).toBeVisible()
  await expect(page.getByTestId("account-menu")).toHaveCount(0)
  // The choice is remembered on this device.
  await page.goto("/greenfield")
  await expect(page).toHaveURL(/\/greenfield\/parent$/)
  await page
    .getByTestId("bottom-bar")
    .getByRole("button", { name: "More" })
    .click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Switch to staff view" })
    .click()
  await expect(page).toHaveURL(/\/greenfield$/)
  await expectSignedInAs(page, "Teacher")
})

test("a parent gets the light parent frame, within budget", async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await parentSignIn(page, PEOPLE.parent.phone, PEOPLE.parent.e164)
  await expect(page).toHaveURL(/\/greenfield\/parent$/)
  await expect(page.getByTestId("sidebar")).toHaveCount(0)
  await expect(
    page.getByTestId("bottom-bar").getByRole("link", { name: "Home" })
  ).toBeVisible()
  await expectNoSidewaysScroll(page)
  await shoot(page, "parent-home-phone")
  await expectAccessible(page, "parent home")

  // Staff pages are not for parents.
  const settings = await page.goto("/greenfield/settings/team")
  expect(page.url()).toMatch(/\/greenfield\/parent$/)
  expect(settings?.ok()).toBe(true)

  // What a parent's phone downloads for this page, from a cold start.
  const fresh = await page.context().browser()?.newContext({ viewport: PHONE })
  if (fresh === undefined) throw new Error("No browser")
  await fresh.addCookies(await page.context().cookies())
  const cold = await fresh.newPage()
  await cold.goto("/greenfield/parent")
  await cold.waitForLoadState("networkidle")
  const bytes = await cold.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .concat(performance.getEntriesByType("navigation"))
      .reduce(
        (sum, entry) =>
          sum + ((entry as PerformanceResourceTiming).transferSize || 0),
        0
      )
  )
  writeFileSync(
    join(SHOTS, "parent-first-load.txt"),
    `${String(Math.round(bytes / 1024))} KiB
`
  )
  // Before the frame, main's parent landing page measured 313 KiB this way (a cold
  // production load at 375 px, 13/11/2026). The frame may add at most 10 KB
  // (acceptance criterion 8). Lower this when T13 and T14 bring the page down.
  expect(bytes / 1024).toBeLessThanOrEqual(323)
  test.info().annotations.push({
    type: "parent first load",
    description: `${String(Math.round(bytes / 1024))} KiB`,
  })
  await fresh.close()
})
