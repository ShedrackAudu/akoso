import { execFileSync } from "node:child_process"

import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { runSqlAsOwner } from "./global-setup"
import { clearSmsOutbox, PEOPLE, totp } from "./sign-in-helpers"

// School setup part A (spec: docs/specs/stage-2-school-setup-a.md, acceptance criteria
// 1, 9 and 10): a teacher has no Setup; the proprietor sets up a primary school with the
// defaults, through the screens; axe passes on every Setup screen, light and dark.

const GREENFIELD = "9a000000-0000-4000-8000-000000000001"
const SETUP_TABLES = [
  "arm_subjects",
  "class_arms",
  "classes",
  "levels",
  "subjects",
  "terms",
  "academic_sessions",
  "non_school_days",
  "school_profiles",
]

test.describe.configure({ mode: "serial" })
test.use({ viewport: { width: 1280, height: 800 } })

/** Greenfield starts with nothing set up (the seed doesn't touch these tables). */
function clearGreenfieldSetup(): void {
  runSqlAsOwner(
    SETUP_TABLES.map(
      (table) =>
        `delete from school_setup.${table} where tenant_id = '${GREENFIELD}';`
    ).join("\n")
  )
}

test.beforeAll(() => {
  clearGreenfieldSetup()
})
test.beforeEach(() => {
  clearSmsOutbox()
})
// The proprietor sets up a second step here; the seed puts everything back.
test.afterAll(() => {
  clearGreenfieldSetup()
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

/** A notice saying this, wherever on the page the change was made. */
const notice = (page: Page, text: string | RegExp) =>
  page.getByTestId("setup-notice").filter({ hasText: text })

test("a teacher has no Setup, and the address answers 404 (criterion 1)", async ({
  page,
}) => {
  await staffPassword(page, PEOPLE.teacher.email, PEOPLE.teacher.password)
  await page.goto("/greenfield")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Setup", exact: true })
  ).toHaveCount(0)
  const response = await page.goto("/greenfield/setup")
  expect(response?.status()).toBe(404)
})

test("the proprietor sets up a primary school with the defaults (criteria 1, 9, 10)", async ({
  page,
}) => {
  await proprietorSignIn(page)
  await page.getByRole("link", { name: "Setup", exact: true }).first().click()
  await expect(page).toHaveURL(/\/greenfield\/setup$/)
  const steps = page.getByTestId("setup-checklist").getByRole("listitem")
  await expect(steps).toHaveCount(5)
  await expect(
    page.getByTestId("setup-step-profile").locator("[data-state]")
  ).toHaveAttribute("data-state", "not_started")
  await expectAccessible(page, "checklist")

  // 1. The profile.
  await page.getByTestId("setup-step-profile").click()
  await page.getByLabel("Primary", { exact: true }).check()
  await page.getByLabel("Address").fill("12 Unity Road, Ikeja")
  await page.getByLabel("State").selectOption("Lagos")
  await page.getByLabel("Phone").fill("0803 123 4567")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(notice(page, "Profile saved.")).toBeVisible()
  await expectAccessible(page, "profile")

  // 2. The session and its terms; a wrong order is refused in plain words.
  await page.getByRole("link", { name: "Session and terms" }).click()
  await page.getByLabel("Session", { exact: true }).fill("2026/2027")
  await page.getByLabel("First day").fill("2026-09-07")
  await page.getByLabel("Last day").fill("2027-07-23")
  await page.getByRole("button", { name: "Add session" }).click()
  await expect(notice(page, "Session added.")).toBeVisible()
  const term = (number: number) =>
    page.getByRole("group", { name: new RegExp(`^Term ${String(number)}`) })
  await term(1).getByLabel("Starts", { exact: true }).fill("2026-09-07")
  await term(1).getByLabel("Ends", { exact: true }).fill("2026-12-11")
  await term(2).getByLabel("Starts", { exact: true }).fill("2026-12-01")
  await term(2).getByLabel("Ends", { exact: true }).fill("2027-04-02")
  await page.getByRole("button", { name: "Save term dates" }).click()
  await expect(page.getByTestId("form-error")).toHaveText(
    "Term 2 must start after term 1 ends."
  )
  await term(2).getByLabel("Starts", { exact: true }).fill("2027-01-05")
  await term(3).getByLabel("Starts", { exact: true }).fill("2027-04-26")
  await term(3).getByLabel("Ends", { exact: true }).fill("2027-07-23")
  await page.getByRole("button", { name: "Save term dates" }).click()
  await expect(notice(page, "Term dates saved.")).toBeVisible()
  await expect(term(1)).toContainText("school days")
  await expectAccessible(page, "session")

  // 3. The calendar: the suggested holidays, confirmed.
  await page.getByRole("link", { name: "Calendar" }).click()
  await expect(page.getByLabel(/Independence Day/)).toBeChecked()
  await page.getByRole("button", { name: "Add ticked holidays" }).click()
  await expect(notice(page, /holidays added\.$/)).toBeVisible()
  await expect(page.getByTestId("days-off").getByRole("listitem")).toHaveCount(
    6
  )
  await expectAccessible(page, "calendar")

  // 4. Classes: Primary 1 to 6, each with arm A.
  await page.getByRole("link", { name: "Classes and arms" }).click()
  await page.getByRole("button", { name: "Add the usual classes" }).click()
  await expect(notice(page, "6 classes added, each with arm A.")).toBeVisible()
  await expect(page.getByTestId("class")).toHaveCount(6)
  await expect(
    page.getByRole("button", { name: "Edit Primary 4 A" })
  ).toBeVisible()
  await expectAccessible(page, "classes")

  // 5. Subjects, from the NERDC lists.
  await page.getByRole("link", { name: "Subjects" }).click()
  await page.getByRole("button", { name: "Fill from the NERDC lists" }).click()
  await expect(notice(page, /^6 arms filled; \d+ subjects added/)).toBeVisible()
  await page.locator("summary", { hasText: "Primary 4 A" }).click()
  await expect(
    page.getByRole("group", { name: "Subjects Primary 4 A takes" })
  ).toBeVisible()
  await expectAccessible(page, "subjects")

  // Every step is done.
  await page.getByRole("link", { name: "All setup steps" }).click()
  for (const key of ["profile", "session", "calendar", "classes", "subjects"]) {
    await expect(
      page.getByTestId(`setup-step-${key}`).locator("[data-state]")
    ).toHaveAttribute("data-state", "done")
  }
})
