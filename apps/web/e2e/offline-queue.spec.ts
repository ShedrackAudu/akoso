// Spike 02 (docs/specs/stage-1-spike-02-offline-queue.md): offline score entry and
// sync in a real browser, on a phone-sized screen.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  chromium,
  devices,
  expect,
  test,
  type BrowserContext,
} from "@playwright/test"

import {
  COMPONENTS,
  SHEET_PATH,
  enterScore,
  goOffline,
  goOnline,
  openSheet,
  resetServer,
  scoreKey,
  serverSheet,
  setSwitches,
  studentId,
  throttleTo3G,
  waitUntilAllSent,
} from "./offline-helpers"
import { querySqlAsOwner } from "./global-setup"

test.beforeEach(() => {
  resetServer()
})

test("section 20 acceptance: 300 scores and a register of 40, entered offline, all reach the school once", async ({
  context,
  page,
  request,
}) => {
  await openSheet(page)
  await goOffline(context)

  // The page still opens with no connection, from the service worker.
  await page.reload()
  await expect(
    page.getByRole("heading", { name: "JSS 2A (spike)" })
  ).toBeVisible()
  await expect(page.getByTestId("status-bar")).toHaveAttribute(
    "data-online",
    "no"
  )

  // 300 entries: every cell once (135), every cell again (135), then 30 more changes.
  // Only the last value of each cell should reach the school.
  const expected = new Map<string, string>()
  const passes: [number, number][] = [
    [45, 0],
    [45, 7],
    [10, 13],
  ]
  let entries = 0
  for (const [students, shift] of passes) {
    for (let s = 0; s < students; s += 1) {
      for (const c of COMPONENTS) {
        const value = String((s * 3 + shift) % (c.maximum + 1))
        await enterScore(page, scoreKey(s, c.key), value)
        expected.set(scoreKey(s, c.key), value)
        entries += 1
      }
    }
  }
  expect(entries).toBe(300)

  await page.getByRole("tab", { name: "Register" }).click()
  const today = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("akoso-spike-offline")
      open.onsuccess = () => {
        resolve(open.result)
      }
      open.onerror = () => {
        reject(new Error("could not open the phone's store"))
      }
    })
    return new Promise<string>((resolve) => {
      const read = db.transaction("sheet").objectStore("sheet").get("current")
      read.onsuccess = () => {
        resolve((read.result as { schoolToday: string }).schoolToday)
      }
    })
  })
  const statuses = ["Present", "Absent", "Late", "Excused"] as const
  for (let s = 0; s < 40; s += 1) {
    const status = statuses[s % statuses.length] ?? "Present"
    const key = `attendance:${studentId(s)}:${today}`
    await page.getByTestId(key).getByText(status, { exact: true }).click()
    expected.set(key, status.toLowerCase())
  }

  // Everything is waiting on the phone: 135 score cells and 40 register entries.
  await expect(page.getByTestId("status-bar")).toHaveAttribute(
    "data-waiting",
    "175"
  )

  // Reconnect on a slow connection.
  await context.setOffline(false)
  await throttleTo3G(context, page)
  await goOnline(context, page)
  await waitUntilAllSent(page)

  const sheet = await serverSheet(request)
  expect(sheet.cells).toHaveLength(expected.size)
  for (const cell of sheet.cells) {
    expect(cell.value, cell.cellKey).toBe(expected.get(cell.cellKey))
  }

  // Exactly once: every cell's version equals the number of distinct changes the
  // school applied to it. A change applied twice would push the version past that.
  // (Usually 1; it is 2 where a second edit came in while the first was being sent,
  // which is two real changes, not a repeat.)
  const mismatches = querySqlAsOwner(`
    select c.cell_key, c.version, count(o.op_id)
    from spike_offline.cells c
    left join spike_offline.applied_operations o
      on o.cell_key = c.cell_key and o.outcome in ('applied', 'applied_over_conflict')
    group by c.cell_key, c.version
    having c.version <> count(o.op_id)`)
  expect(mismatches).toEqual([])
  const repeats = querySqlAsOwner(
    "select count(*) from spike_offline.applied_operations where outcome = 'duplicate'"
  )
  console.info(`Repeats recognised and ignored: ${repeats[0]?.[0] ?? "?"}`)
})

test("a sync cut off after the school saved it, but before the phone heard back, is not applied twice", async ({
  context,
  page,
  request,
}) => {
  await openSheet(page)
  await goOffline(context)
  for (let s = 0; s < 5; s += 1) {
    await enterScore(page, scoreKey(s, "CA1"), String(10 + s))
  }

  let cutOff = false
  // Context-level: requests that pass through the service worker skip page.route().
  await context.route("**/api/spike/offline/sync", async (route) => {
    if (!cutOff) {
      cutOff = true
      await route.fetch() // the school receives and saves the changes...
      await route.abort("connectionreset") // ...but the answer never reaches the phone
      return
    }
    await route.continue()
  })

  await goOnline(context, page)
  await waitUntilAllSent(page)
  expect(cutOff).toBe(true)

  const sheet = await serverSheet(request)
  expect(sheet.cells.map((c) => [c.value, c.version])).toEqual([
    ["10", 1],
    ["11", 1],
    ["12", 1],
    ["13", 1],
    ["14", 1],
  ])
})

test("two phones change the same score offline: the change received later wins, and the other is kept for review", async ({
  browser,
  page,
  request,
}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL
  const second = await browser.newContext({ ...devices["Pixel 5"], baseURL })
  const otherPage = await second.newPage()
  try {
    await openSheet(page)
    await openSheet(otherPage)
    await goOffline(page.context())
    await goOffline(second)

    const cell = scoreKey(0, "EXAM")
    await enterScore(page, cell, "40")
    await enterScore(otherPage, cell, "52")

    await goOnline(page.context(), page)
    await waitUntilAllSent(page)
    await goOnline(second, otherPage)
    await waitUntilAllSent(otherPage)

    const saved = (await serverSheet(request)).cells.find(
      (c) => c.cellKey === cell
    )
    expect(saved).toMatchObject({ value: "52", version: 2 })

    await page.goto("/spike/offline/conflicts")
    const row = page
      .getByTestId("conflicts")
      .getByRole("row", { name: new RegExp(cell) })
    await expect(row).toContainText("40")
    await expect(row).toContainText("52")
  } finally {
    await second.close()
  }
})

test("changes made offline to a sheet that was approved meanwhile are refused, kept and shown, not lost", async ({
  context,
  page,
  request,
}) => {
  await openSheet(page)
  await goOffline(context)
  await enterScore(page, scoreKey(1, "CA1"), "15")
  await enterScore(page, scoreKey(2, "CA1"), "16")

  await setSwitches(request, { sheetLocked: true })
  await goOnline(context, page)

  const refused = page.getByTestId("refused")
  await expect(refused).toContainText("2 changes were not saved")
  await expect(refused).toContainText("approved while you were offline")
  expect((await serverSheet(request)).cells).toEqual([])
})

test("when the sign-in expires, unsent changes stay on the phone and are sent after signing in again", async ({
  context,
  page,
  request,
}) => {
  await openSheet(page)
  await goOffline(context)
  for (let s = 0; s < 3; s += 1) {
    await enterScore(page, scoreKey(s, "CA2"), String(s + 5))
  }

  await setSwitches(request, { sessionExpired: true })
  await goOnline(context, page)

  await expect(page.getByRole("status")).toContainText(
    "Your sign-in has expired. 3 changes are kept on this phone"
  )
  expect(
    (await serverSheet(request).catch(() => ({ cells: [] }))).cells
  ).toEqual([])

  await page.getByRole("button", { name: "Sign in again" }).click()
  await waitUntilAllSent(page)
  expect((await serverSheet(request)).cells.map((c) => c.value)).toEqual([
    "5",
    "6",
    "7",
  ])
})

test("unsent changes survive the browser being closed and the phone restarting", async ({
  request,
}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL
  // A persistent profile takes the phone's screen and agent, but not a browser choice.
  const phone: Omit<(typeof devices)["Pixel 5"], "defaultBrowserType"> = {
    ...devices["Pixel 5"],
  }
  delete (phone as { defaultBrowserType?: string }).defaultBrowserType
  const profile = mkdtempSync(join(tmpdir(), "akoso-phone-"))
  const launch = (): Promise<BrowserContext> =>
    chromium.launchPersistentContext(profile, { ...phone, baseURL })

  try {
    const before = await launch()
    const page = before.pages()[0] ?? (await before.newPage())
    await openSheet(page)
    await goOffline(before)
    for (let s = 0; s < 4; s += 1) {
      await enterScore(page, scoreKey(s, "EXAM"), String(30 + s))
    }
    await expect(page.getByTestId("status-bar")).toHaveAttribute(
      "data-waiting",
      "4"
    )
    await before.close() // the browser is killed with work unsent

    expect((await serverSheet(request)).cells).toEqual([])

    const after = await launch() // the phone restarts, with a connection
    const reopened = after.pages()[0] ?? (await after.newPage())
    await reopened.goto(SHEET_PATH)
    await waitUntilAllSent(reopened)
    await after.close()

    expect((await serverSheet(request)).cells.map((c) => c.value)).toEqual([
      "30",
      "31",
      "32",
      "33",
    ])
  } finally {
    rmSync(profile, { recursive: true, force: true })
  }
})

test("signing out with unsent changes asks first, and discards only after the teacher confirms (D-9)", async ({
  context,
  page,
  request,
}) => {
  await openSheet(page)
  await goOffline(context)
  for (let s = 0; s < 3; s += 1) {
    await enterScore(page, scoreKey(s, "CA1"), "9")
  }

  await page.getByRole("button", { name: "Sign out" }).click()
  const warning = page.getByRole("alertdialog")
  await expect(warning).toContainText(
    "3 changes have not reached the school yet"
  )

  await warning.getByRole("button", { name: "Stay signed in" }).click()
  await expect(page.getByTestId("status-bar")).toHaveAttribute(
    "data-waiting",
    "3"
  )

  await page.getByRole("button", { name: "Sign out" }).click()
  await page.getByRole("button", { name: "Sign out and discard" }).click()
  await expect(page.getByText("You are signed out.")).toBeVisible()

  await goOnline(context, page)
  await page.getByRole("button", { name: "Sign in" }).click()
  await waitUntilAllSent(page)
  expect((await serverSheet(request)).cells).toEqual([])
})

test("signing out with everything sent signs out straight away", async ({
  page,
}) => {
  await openSheet(page)
  await enterScore(page, scoreKey(0, "CA1"), "12")
  await waitUntilAllSent(page)
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page.getByText("You are signed out.")).toBeVisible()
})

test("a page never opened before shows the offline page instead of a browser error", async ({
  context,
  page,
}) => {
  await openSheet(page)
  await goOffline(context)
  await page.goto("/spike/offline/conflicts")
  await expect(
    page.getByRole("heading", { name: "You are offline" })
  ).toBeVisible()
})
