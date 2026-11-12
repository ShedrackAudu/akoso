// The Paystack adapter. Request shapes from Paystack's API reference, checked on
// 11/11/2026; each is exercised against test mode in spike 04 before it is relied on.
import {
  PaymentProviderError,
  type PaymentProvider,
  type ProviderTransaction,
} from "./port"

const BASE_URL = "https://api.paystack.co"

export interface PaystackOptions {
  secretKey: string
  /** Refuse anything but a test key. On for the whole of spike 04. */
  testModeOnly: boolean
  timeoutMs?: number
}

interface Envelope {
  status: boolean
  message: string
  data: unknown
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

// Strings pass through; numbers and booleans are written out; anything else (an object
// where Paystack should send text) becomes empty, never "[object Object]".
const text = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : ""
const kobo = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) ? value : Number.NaN

export function createPaystackProvider(
  options: PaystackOptions
): PaymentProvider {
  if (options.testModeOnly && !options.secretKey.startsWith("sk_test_")) {
    // The key itself is never put in a message or a log.
    throw new PaymentProviderError(
      "Paystack: only a test secret key is allowed here",
      null,
      false
    )
  }
  const timeoutMs = options.timeoutMs ?? 20_000

  async function call(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown
  ): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${options.secretKey}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.name : "unknown"
      throw new PaymentProviderError(
        `Paystack could not be reached (${reason})`,
        null,
        true
      )
    }
    const parsed = record(
      await response.json().catch(() => ({}))
    ) as Partial<Envelope>
    if (!response.ok || parsed.status !== true) {
      const retryable = response.status >= 500 || response.status === 429
      throw new PaymentProviderError(
        `Paystack ${method} ${path.split("?")[0] ?? path} failed (${String(response.status)}): ${text(parsed.message)}`,
        response.status,
        retryable
      )
    }
    return parsed.data
  }

  return {
    async resolveAccount(accountNumber, bankCode) {
      const query = new URLSearchParams({
        account_number: accountNumber,
        bank_code: bankCode,
      })
      const data = record(
        await call("GET", `/bank/resolve?${query.toString()}`)
      )
      return {
        accountNumber: text(data.account_number),
        accountName: text(data.account_name),
      }
    },

    async createSubaccount(input) {
      // The reference lists `bank_code`; its own example sends `settlement_bank`. Both are
      // sent until the spike shows which Paystack reads.
      const data = record(
        await call("POST", "/subaccount", {
          business_name: input.businessName,
          bank_code: input.bankCode,
          settlement_bank: input.bankCode,
          account_number: input.accountNumber,
          percentage_charge: input.percentageCharge,
        })
      )
      return {
        code: text(data.subaccount_code),
        businessName: text(data.business_name),
        percentageCharge: Number(data.percentage_charge),
      }
    },

    async setSubaccountPercentage(code, businessName, percentageCharge) {
      if (
        !Number.isFinite(percentageCharge) ||
        percentageCharge < 0 ||
        percentageCharge > 100
      ) {
        throw new PaymentProviderError(
          "Percentage must be between 0 and 100",
          null,
          false
        )
      }
      const data = record(
        await call("PUT", `/subaccount/${encodeURIComponent(code)}`, {
          business_name: businessName,
          percentage_charge: percentageCharge,
        })
      )
      return {
        code: text(data.subaccount_code ?? code),
        businessName: text(data.business_name),
        percentageCharge: Number(data.percentage_charge),
      }
    },

    async createSplitGroup(input) {
      const data = record(
        await call("POST", "/split", {
          name: input.name,
          type: "percentage",
          currency: "NGN",
          subaccounts: [
            {
              subaccount: input.subaccountCode,
              share: input.subaccountSharePercent,
            },
          ],
          bearer_type: "subaccount",
          bearer_subaccount: input.feeBearerSubaccountCode,
        })
      )
      return { code: text(data.split_code) }
    },

    async createCustomer(input) {
      const data = record(
        await call("POST", "/customer", {
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
        })
      )
      return { code: text(data.customer_code), email: text(data.email) }
    },

    async createDedicatedAccount(input) {
      const data = record(
        await call("POST", "/dedicated_account", {
          customer: input.customerCode,
          preferred_bank: input.preferredBank,
          ...(input.subaccountCode === undefined
            ? {}
            : { subaccount: input.subaccountCode }),
          ...(input.splitCode === undefined
            ? {}
            : { split_code: input.splitCode }),
        })
      )
      return {
        accountNumber: text(data.account_number),
        accountName: text(data.account_name),
        bankName: text(record(data.bank).name),
        customerCode: text(
          record(data.customer).customer_code || input.customerCode
        ),
      }
    },

    async startCardPayment(input) {
      if (
        !Number.isInteger(input.amount) ||
        !Number.isInteger(input.platformChargeKobo)
      ) {
        throw new PaymentProviderError(
          "Amounts must be whole kobo",
          null,
          false
        )
      }
      const data = record(
        await call("POST", "/transaction/initialize", {
          email: input.email,
          amount: String(input.amount),
          reference: input.reference,
          subaccount: input.subaccountCode,
          transaction_charge: input.platformChargeKobo,
          bearer: "subaccount",
          channels: ["card"],
        })
      )
      return {
        reference: text(data.reference),
        authorizationUrl: text(data.authorization_url),
      }
    },

    async listTransactions(input) {
      const query = new URLSearchParams({
        page: String(input.page),
        perPage: String(input.perPage),
        ...(input.from === undefined ? {} : { from: input.from }),
      })
      const data = await call("GET", `/transaction?${query.toString()}`)
      const rows = Array.isArray(data) ? data : []
      return rows.map((row): ProviderTransaction => {
        const r = record(row)
        return {
          reference: text(r.reference),
          status: text(r.status),
          channel: text(r.channel),
          amount: kobo(r.amount),
          fees: typeof r.fees === "number" ? r.fees : null,
          paidAt: typeof r.paid_at === "string" ? r.paid_at : null,
          customerCode:
            typeof record(r.customer).customer_code === "string"
              ? text(record(r.customer).customer_code)
              : null,
          split: r.split ?? null,
        }
      })
    },
  }
}
