import type { PaymentProvider, ProviderTransaction } from "./port"

/**
 * The fake payment provider for tests and local work without Paystack. Deterministic
 * codes; records what was asked so tests can check it.
 */
export function createFakePaymentProvider(): PaymentProvider & {
  calls: { method: string; input: unknown }[]
  transactions: ProviderTransaction[]
} {
  const calls: { method: string; input: unknown }[] = []
  const transactions: ProviderTransaction[] = []
  let n = 0
  const next = (prefix: string): string =>
    `${prefix}_FAKE${String(++n).padStart(6, "0")}`
  const log = (method: string, input: unknown): void => {
    calls.push({ method, input })
  }

  return {
    calls,
    transactions,
    resolveAccount(accountNumber, bankCode) {
      log("resolveAccount", { accountNumber, bankCode })
      return Promise.resolve({
        accountNumber,
        accountName: "FAKE SCHOOL ACCOUNT",
      })
    },
    createSubaccount(input) {
      log("createSubaccount", input)
      return Promise.resolve({
        code: next("ACCT"),
        businessName: input.businessName,
        percentageCharge: input.percentageCharge,
      })
    },
    setSubaccountPercentage(code, businessName, percentageCharge) {
      log("setSubaccountPercentage", { code, percentageCharge })
      return Promise.resolve({ code, businessName, percentageCharge })
    },
    createSplitGroup(input) {
      log("createSplitGroup", input)
      return Promise.resolve({ code: next("SPL") })
    },
    createCustomer(input) {
      log("createCustomer", input)
      return Promise.resolve({ code: next("CUS"), email: input.email })
    },
    createDedicatedAccount(input) {
      log("createDedicatedAccount", input)
      return Promise.resolve({
        accountNumber: `99${String(++n).padStart(8, "0")}`,
        accountName: "AKOSO/FAKE FAMILY",
        bankName: "Fake Bank",
        customerCode: input.customerCode,
      })
    },
    startCardPayment(input) {
      log("startCardPayment", input)
      return Promise.resolve({
        reference: input.reference,
        authorizationUrl: "https://checkout.example/fake",
      })
    },
    listTransactions(input) {
      log("listTransactions", input)
      const start = (input.page - 1) * input.perPage
      return Promise.resolve(transactions.slice(start, start + input.perPage))
    },
  }
}
