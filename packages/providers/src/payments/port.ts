// The payment provider interface (brief section 14). Paystack first; Monnify later
// behind the same interface. Amounts are integer kobo throughout.
//
// Deliberately absent: any way to REMOVE a split from a dedicated account. Removing it
// would send every later payment to Akoso's main account instead of the school's (risk
// R2). To stop Akoso's share, set the school's percentage to 0; never remove the split.

/** Integer kobo (₦1 = 100 kobo). */
export type Kobo = number

export class PaymentProviderError extends Error {
  readonly status: number | null
  readonly retryable: boolean

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message)
    this.name = "PaymentProviderError"
    this.status = status
    this.retryable = retryable
  }
}

export interface ResolvedAccount {
  accountNumber: string
  accountName: string
}

export interface Subaccount {
  code: string
  businessName: string
  /** Akoso's share of each payment, in percent. */
  percentageCharge: number
}

export interface Customer {
  code: string
  email: string
}

export interface DedicatedAccount {
  accountNumber: string
  accountName: string
  bankName: string
  customerCode: string
}

export interface CardCheckout {
  reference: string
  authorizationUrl: string
}

export interface ProviderTransaction {
  /** Paystack's reference: a string. Never rely on its numeric ID (64-bit). */
  reference: string
  status: string
  channel: string
  amount: Kobo
  fees: Kobo | null
  paidAt: string | null
  customerCode: string | null
  /** How the amount was divided, exactly as the provider reported it. */
  split: unknown
}

export interface PaymentProvider {
  /** Confirms a bank account's name, before a school's settlement account is used. */
  resolveAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<ResolvedAccount>
  /** A school's subaccount, settled straight to its own bank account. */
  createSubaccount(input: {
    businessName: string
    bankCode: string
    accountNumber: string
    percentageCharge: number
  }): Promise<Subaccount>
  /**
   * Changes Akoso's share for a school. Set 0 to stop collecting, never remove the
   * split (risk R2).
   */
  setSubaccountPercentage(
    code: string,
    businessName: string,
    percentageCharge: number
  ): Promise<Subaccount>
  /** A split group: shares to subaccounts, the rest to Akoso, with a chosen fee bearer. */
  createSplitGroup(input: {
    name: string
    subaccountCode: string
    subaccountSharePercent: number
    feeBearerSubaccountCode: string
  }): Promise<{ code: string }>
  createCustomer(input: {
    email: string
    firstName: string
    lastName: string
    phone: string
  }): Promise<Customer>
  /** One billing account's fees account, linked to its school's subaccount or split group. */
  createDedicatedAccount(input: {
    customerCode: string
    preferredBank: string
    subaccountCode?: string
    splitCode?: string
  }): Promise<DedicatedAccount>
  /**
   * Starts a card payment. `platformChargeKobo` overrides the split for this one payment
   * (section 25.1); the school's subaccount bears the provider's fee.
   */
  startCardPayment(input: {
    email: string
    amount: Kobo
    reference: string
    subaccountCode: string
    platformChargeKobo: Kobo
  }): Promise<CardCheckout>
  /** One page of transactions, newest first, for the nightly reconciliation. */
  listTransactions(input: {
    page: number
    perPage: number
    from?: string
  }): Promise<ProviderTransaction[]>
}
