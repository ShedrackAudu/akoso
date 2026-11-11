// Spike 02. Shared steps for the offline tests.
import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test"

import { runSqlAsOwner } from "./global-setup"

export const SHEET_PATH = "/spike/offline"

/** Fake student IDs from packages/core/src/offline-sync/spike/fixtures.ts. */
export function studentId(index: number): string {
  return `0e000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
}

export const COMPONENTS = [
  { key: "CA1", maximum: 20 },
  { key: "CA2", maximum: 20 },
  { key: "EXAM", maximum: 60 },
] as const

export function scoreKey(index: number, component: string): string {
  return `score:${studentId(index)}:${component}`
}

/** Empties the spike tables. TRUNCATE as the superuser, since conflicts are append-only. */
export function resetServer(): void {
  runSqlAsOwner(
    "TRUNCATE spike_offline.cells, spike_offline.applied_operations, spike_offline.conflicts, spike_offline.state;"
  )
}

export async function setSwitches(
  request: APIRequestContext,
  change: { sheetLocked?: boolean; sessionExpired?: boolean }
): Promise<void> {
  const response = await request.post("/api/spike/offline/switches", {
    data: change,
  })
  expect(response.ok()).toBe(true)
}

export interface ServerSheet {
  schoolToday: string
  cells: { cellKey: string; value: string; version: number }[]
}

export async function serverSheet(
  request: APIRequestContext
): Promise<ServerSheet> {
  const response = await request.get("/api/spike/offline/sheet")
  expect(response.ok()).toBe(true)
  return (await response.json()) as ServerSheet
}

/** Opens the sheet online and waits until the service worker controls the page. */
export async function openSheet(page: Page): Promise<void> {
  await page.goto(SHEET_PATH)
  await expect(
    page.getByRole("heading", { name: "JSS 2A (spike)" })
  ).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller === null) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          resolve()
        })
      })
    }
  })
}

/** Types a score and moves on, as a teacher would. */
export async function enterScore(
  page: Page,
  cellKey: string,
  value: string
): Promise<void> {
  const input = page.getByTestId(cellKey)
  await input.fill(value)
  await input.press("Tab")
}

export async function waitUntilAllSent(page: Page): Promise<void> {
  const bar = page.getByTestId("status-bar")
  await expect(bar).toHaveAttribute("data-waiting", "0", { timeout: 90_000 })
  await expect(bar).toHaveAttribute("data-online", "yes")
}

/** Cuts the connection the way a phone loses signal: the browser cannot reach anything. */
export async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true)
}

export async function goOnline(
  context: BrowserContext,
  page: Page
): Promise<void> {
  await context.setOffline(false)
  // Browsers fire "online" when the connection returns; the app also retries on a timer.
  await page.evaluate(() => window.dispatchEvent(new Event("online")))
}

/** Roughly a slow 3G connection, through the Chrome DevTools protocol. */
export async function throttleTo3G(
  context: BrowserContext,
  page: Page
): Promise<void> {
  const cdp = await context.newCDPSession(page)
  await cdp.send("Network.enable")
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  })
}
