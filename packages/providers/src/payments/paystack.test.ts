import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { createPaystackProvider } from "./paystack"
import { PaymentProviderError } from "./port"

const TEST_KEY = "sk_test_not_a_real_key_0000000000"

type Captured = { url: string; init: RequestInit }

function stubFetch(
  responder: (call: Captured) => { status?: number; body: unknown }
): Captured[] {
  const calls: Captured[] = []
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    const call = { url, init }
    calls.push(call)
    const { status = 200, body } = responder(call)
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Paystack adapter", () => {
  it("refuses a live key while test mode is required, without echoing the key", () => {
    const live = "sk_live_secret_value_must_not_leak"
    let message = ""
    try {
      createPaystackProvider({ secretKey: live, testModeOnly: true })
    } catch (error) {
      message = error instanceof Error ? error.message : ""
    }
    expect(message).toMatch(/only a test secret key/)
    expect(message).not.toContain("secret_value")
  })

  it("starts a card payment with a flat platform charge and the school bearing the fee", async () => {
    const calls = stubFetch(() => ({
      body: {
        status: true,
        message: "ok",
        data: { reference: "R1", authorization_url: "https://checkout/x" },
      },
    }))
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    await provider.startCardPayment({
      email: "parent@example.com",
      amount: 15_000_000,
      reference: "R1",
      subaccountCode: "ACCT_school",
      platformChargeKobo: 1_500_000,
    })
    const sent = JSON.parse(calls[0]?.init.body as string) as Record<
      string,
      unknown
    >
    expect(calls[0]?.url).toBe("https://api.paystack.co/transaction/initialize")
    expect(sent).toMatchObject({
      amount: "15000000",
      subaccount: "ACCT_school",
      transaction_charge: 1_500_000,
      bearer: "subaccount",
    })
  })

  it("refuses amounts that are not whole kobo, before calling Paystack", async () => {
    const calls = stubFetch(() => ({ body: {} }))
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    await expect(
      provider.startCardPayment({
        email: "p@example.com",
        amount: 100.5,
        reference: "R2",
        subaccountCode: "ACCT_s",
        platformChargeKobo: 0,
      })
    ).rejects.toBeInstanceOf(PaymentProviderError)
    expect(calls).toHaveLength(0)
  })

  it("refuses a percentage outside 0 to 100", async () => {
    stubFetch(() => ({ body: {} }))
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    await expect(
      provider.setSubaccountPercentage("ACCT_s", "School", 101)
    ).rejects.toBeInstanceOf(PaymentProviderError)
    await expect(
      provider.setSubaccountPercentage("ACCT_s", "School", -1)
    ).rejects.toBeInstanceOf(PaymentProviderError)
  })

  it("reports Paystack's refusal with its status, never the key", async () => {
    stubFetch(() => ({
      status: 400,
      body: { status: false, message: "Invalid bank code" },
    }))
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    const failure = await provider
      .resolveAccount("0000000000", "999")
      .catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(PaymentProviderError)
    expect((failure as PaymentProviderError).status).toBe(400)
    expect((failure as PaymentProviderError).retryable).toBe(false)
    expect((failure as Error).message).toContain("Invalid bank code")
    expect((failure as Error).message).not.toContain(TEST_KEY)
  })

  it("treats 5xx and rate limits as worth retrying", async () => {
    stubFetch(() => ({ status: 503, body: { status: false, message: "down" } }))
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    const failure = (await provider
      .listTransactions({ page: 1, perPage: 50 })
      .catch((e: unknown) => e)) as PaymentProviderError
    expect(failure.retryable).toBe(true)
  })
})

describe("risk R2: nothing in Akoso can remove a split from a dedicated account", () => {
  // Built from parts so this file does not match its own search.
  const FORBIDDEN = ["dedicated_account", "split"].join("/")
  const ROOT = resolve(import.meta.dirname, "../../../..")
  const SOURCE_DIRS = ["packages", "apps"]
  const SKIP = new Set([
    "node_modules",
    ".next",
    "dist",
    "coverage",
    ".spike-preview",
  ])

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      if (SKIP.has(name)) return []
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return sourceFiles(path)
      return /\.(ts|tsx|js|mjs|cjs)$/.test(name) ? [path] : []
    })
  }

  it("no source file mentions the split-removal endpoint", () => {
    const offenders = SOURCE_DIRS.flatMap((d) =>
      sourceFiles(join(ROOT, d))
    ).filter((file) => readFileSync(file, "utf8").includes(FORBIDDEN))
    expect(offenders).toEqual([])
  })

  it("the payment provider interface has no method that removes a split", () => {
    const provider = createPaystackProvider({
      secretKey: TEST_KEY,
      testModeOnly: true,
    })
    const names = Object.keys(provider)
    expect(names.filter((n) => /remove|delete/i.test(n))).toEqual([])
  })
})
