## 25. Subscriptions and billing (our revenue)

Design a configurable subscription system. Plan names, prices and limits are data, not code. Describe plan contents with the product-family names from section 4.0 (Akoso Pay, Akoso Reports, Akoso Parent, Akoso Admit, Akoso Staff, Akoso Prefect, Akoso Insight).

Suggested initial plans, priced per **active student per term** with a minimum per term:

| Plan | Price per active student per term | Minimum per term | Includes |
| --- | --- | --- | --- |
| Starter | ₦400 | ₦30,000 | Setup, records, results and report cards, attendance, fee invoicing and collection through family bank accounts with automatic receipts, messaging (credits extra) |
| Standard | ₦700 | ₦50,000 | Starter + parent app, debtor dashboard and reminders, WhatsApp, admissions |
| Premium | ₦1,000 | ₦100,000 | Standard + payroll, expenses, AI drafts, multi-branch, safeguarding, custom domain, and Part 2 modules once released |

These are starting values, being validated with pilot schools. **All pricing is data, adjustable from the platform admin without a code change:**

- per plan: name, price per active student, minimum per term, included modules and limits;
- per school: a negotiated price or minimum, a discount, or a longer free period, with a reason and an end date;
- platform-fee collection settings (section 25.1): the percentage (default 10%) and the backstop week (default week 6);
- messaging credit prices per channel, the full-session upfront discount, referral credit, agent commission rates and the length of the free first term.

Every change has an effective term and a history. Existing schools keep their current price until the term a change takes effect, and get notice before any increase. The website reads the same pricing data (website prompt, section 2).

Implement:

- Active-student count frozen at a school-term census date (e.g. end of week 4); the term's fee matches that count.
- Free first term for new schools, then automatic conversion or a data export.
- Discount for paying a full session upfront; referral credit (one free term per referred school).
- The school chooses whether it absorbs Akoso's fee or passes it to parents as a per-student "portal fee" line on their invoices. Either way the amount Akoso is owed is the same and it is collected the same way (section 25.1). A portal fee is money the school collects for Akoso, reported separately from school income. When the fee is passed to parents, each parent's invoice shows an "Akoso portal fee" line; once a parent's payment covers it, Akoso issues that parent a receipt and tax invoice for it (showing VAT once Akoso is VAT-registered). Any part of the school's term fee not covered by parents' portal-fee payments (e.g. families who haven't paid) remains owed by the school and is invoiced to the school.
- Messaging credits: deducted automatically like the subscription (section 25.1), or topped up by card.
- Upgrades, downgrades and cancellation; a statement of fees, deductions and credits per school.
- Grace period and read-only mode for unpaid schools. Never delete data or block parents from paying fees because a school's subscription is overdue.
- Agent and referral tracking: referral codes, agent attribution and monthly commission statements generated automatically (default commission 15–20%, configurable per agent).

Verify every payment webhook signature, use idempotency keys, and never trust a frontend success message. Never store card details. Without live credentials, use a clearly labelled **development payment adapter** that simulates webhooks.

### 25.1 Collecting Akoso's fee automatically

Schools never pay Akoso by transfer, and Akoso never chases them. Akoso's fee is deducted automatically from the school-fee payments that pass through Akoso, using Paystack's split payments: each payment settles straight to the school's bank account through its subaccount, and Akoso's share goes straight to Akoso's account. Akoso never receives or holds the school's money (section 14). Every plan, including Starter, collects fees through Akoso, so every school's fee can be deducted this way.

**Term ledger.** At the start of each term, compute what each school owes: `due = max(plan minimum, active students × price)`, plus VAT once Akoso is VAT-registered, minus any credit carried from last term. Track `collected` and `remaining` per school per term, updated from every successful payment (webhooks, plus a nightly reconciliation against the provider's transaction and payout records). Use a per-school lock so simultaneous payments don't overshoot.

**Card payments (exact).** When a parent pays by card, pass a flat platform charge for that single payment: 10% of the payment (the same rate as transfers), or the school's remaining amount if that is smaller. Once the term is paid, send no platform charge. Card payments therefore never overshoot.

**Transfers into family accounts (percentage switch).** Bank transfers into dedicated accounts can't carry a per-payment instruction, so the split is set on the school's subaccount (or a split group), which every family account of that school uses:

- While the term is unpaid, the platform percentage is on: 10% of each parent's payment as it arrives (not of the school's daily payout, which already arrives with Akoso's share taken out). The rate is a setting (default 10%, adjustable per school) and is the same for card payments and transfers. At 10%, a school owing ₦315,000 is paid off once about ₦3.15m of fees has come in through Akoso, usually in the first days of term.
- As `remaining` gets small, step the percentage down; when it reaches zero, set the percentage to 0%. **Never remove the split from a dedicated account**: removing it would send every later payment to Akoso's account instead of the school's.
- A small overshoot (payments landing while the switch changes) is credited to the next term and shown on the school's statement; if the school leaves, it is refunded from Akoso's account.
- The school's dashboard shows, for example, "Akoso fee this term: ₦210,000 of ₦315,000 collected", with each deduction listed. A receipt or tax invoice is issued automatically for the deductions.

**Paystack's fees.** The school always bears Paystack's processing fees, as it would without Akoso. Parents are never charged extra, and Akoso's share is counted in full, before Paystack's fee. On card payments, set the school's subaccount as the fee bearer. On transfers, Paystack charges its fee to Akoso's share while the split is on: use a split group with the school as fee bearer if Paystack confirms this works on dedicated accounts; otherwise add the fees Paystack charged to Akoso to the school's term balance, so deduction runs slightly longer and the school ends up bearing them. Show these fees on the school's statement.

**Backstop: direct debit.** At onboarding, every school sets up a Paystack Direct Debit mandate on its bank account (or, second best, a saved card authorisation) in favour of Akoso's own account. If collections through Akoso haven't covered the term's fee by a school-set week (default week 6), Akoso debits the shortfall automatically and tells the school. This also covers:

- schools whose parents mostly pay cash or into the school's own bank account;
- recovering refunds or chargebacks that Paystack charged to Akoso (section 14), as the school agreement allows.

**Monnify (backup provider).** Monnify reserved accounts support the same split, but the setting is per dedicated account, so switching the fee on or off means one update per account: run it as a queued, retried, idempotent job.

**Verify before relying on it.** Test in Paystack's sandbox, and get Paystack's written confirmation of:

- how quickly a changed percentage applies to the next transfer into a dedicated account;
- who bears Paystack's fee on dedicated-account transfers with a split, and whether a split group's fee-bearer setting is honoured on them;
- how refunds and chargebacks are divided between Akoso and the school on split payments;
- whether a zero platform charge is accepted on a card payment.
- that Akoso's percentage is calculated on the full payment amount, before Paystack's fee is taken from the school's side (e.g. on a ₦150,000 transfer at 10%: Akoso ₦15,000, school ₦134,700 after a ₦300 fee), so Akoso's ledger matches Paystack's records to the kobo.

Record the results in an ADR before building section 25.1, and keep the whole feature behind a feature flag until they are confirmed.

**Contract and tax.** The school agreement must authorise the deductions, the direct-debit backstop, and the recovery of refunds and chargebacks (indemnity and set-off). Store tax rates, Akoso's VAT registration status, each school's TIN and any withholding tax deducted as data with effective dates, like payroll (section 15). Invoices and receipts carry Akoso's TIN, a VAT line once registered, and sequential numbers, ready for the Nigeria Revenue Service's e-invoicing system when it applies to Akoso. For a fee passed to parents, the tax invoice goes to each parent who paid it (section 25); for a fee the school absorbs, it goes to the school.

