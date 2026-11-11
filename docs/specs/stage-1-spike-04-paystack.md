# Spike 04: Paystack dedicated accounts and split payments, in test mode

- **Status:** Approved (founder, 11/11/2026). Webhooks reach this computer through a temporary `cloudflared` tunnel (D-13)
- **Module:** `payments`, `billing`, `packages/providers/payments` · **Brief:** sections 14, 25.1, 28.3, 32.2 · **Stage:** 1
- **Estimate:** 12 hours of agent time, plus about 30 minutes of yours on Paystack's dashboard
- **Informs:** risk R1 (split behaviour on dedicated accounts), R2 (removing a split),
  R4 (the 1,000-account limit) and R5 (BVN prompts). Produces the test-mode evidence for
  the ADR that section 25.1 requires before automatic platform-fee collection is built.

## Why a spike first

Both core promises of Akoso Pay, fees that reconcile themselves and Akoso's own fee
collected automatically, rest on how Paystack's dedicated accounts, subaccounts and
splits behave. The brief lists five things to confirm in Paystack's sandbox before
relying on them (section 25.1). Finding out now costs a session; finding out after the
fees module is built could cost the revenue model.

## What Paystack's documentation says (checked 11/11/2026)

- **Dedicated accounts may need go-live even in test mode.** The page says the feature is
  "only available to registered businesses… that have successfully completed the go-live
  process", yet also explains testing with test keys (`preferred_bank: "test-bank"`) and a
  **demo bank app** for sending test transfers. **The spike's first task is to find out
  which applies to an account that has not gone live.** If test mode is closed too, the
  rest of the spike waits for company registration and go-live, which moves those founder
  tasks earlier.
- **A split can be removed from a dedicated account** (`DELETE /dedicated_account/split`),
  after which payments settle to Akoso's main account. That is risk R2. The spike adds a
  guard and a test that our code can never call it.
- **Webhooks are signed with a timestamp:** a `Paystack-Signature` header (HMAC SHA512 of
  the timestamp and the raw body, keyed with a webhook signing secret `whsec_…`), rejected
  if more than 300 seconds old. The older `x-paystack-signature` (no timestamp) is still
  sent while a secret key exists. We use the new one.
- **Webhooks need a public HTTPS address;** `localhost` cannot receive them. Test-mode
  failures are retried hourly for 10 hours. Paystack records every event and lets you list
  and resend them through its API. Resends are not idempotent, so handlers must ignore
  repeats.
- **Transfers into a dedicated account arrive as `charge.success`** with channel
  `dedicated_nuban`, the sender's name, bank and narration, and the receiving account
  number. Notifications usually come within minutes; a requery endpoint exists, limited to
  once every 10 minutes per account.

Facts from the documentation are recorded as found and checked again in the spike; none
is trusted without a test (brief section 3.3).

## What the spike builds

All on branch `spike/04-paystack`, in folders named `spike`, against Paystack **test mode only**.

1. **The `PaymentProvider` interface** in `packages/providers/payments`, with a Paystack
   adapter and a fake. It covers what the spike exercises: resolve a bank account's name,
   create a subaccount, create a customer and dedicated account (with subaccount), change
   a subaccount's percentage, start a card checkout, list transactions, verify a webhook.
   It has **no method that removes a split** (risk R2).
2. **A webhook endpoint** in the web app that checks the `Paystack-Signature` (timestamp
   and HMAC, constant-time), stores the raw event in a `spike_` inbox table unique on
   Paystack's reference, and answers 200 at once. Repeats, late and out-of-order events
   are recognised.
3. **A test school:** a subaccount on a test bank account, with the account name checked
   against the school's name first (section 14).
4. **Two test families,** each with a customer and a dedicated account linked to the
   school's subaccount.
5. **A script** that drives the scenarios below and records Paystack's answers.

## Scenarios, and what each answers

| #   | Scenario                                                            | Answers                                                                                                                                                 |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Create a dedicated account with test keys                           | Is test mode open before go-live?                                                                                                                       |
| 2   | Transfer into a family's dedicated account with the demo bank app   | Does `charge.success` arrive, signed, with enough to match the family? How quickly?                                                                     |
| 3   | The same event delivered twice, and an old event replayed           | Exactly one payment; the replay rejected by its timestamp                                                                                               |
| 4   | Transfer with the subaccount's percentage at 10%                    | How Paystack divides the amount and its fee between Akoso and the school; whether the 10% is taken on the full amount (section 25.1's ₦150,000 example) |
| 5   | Change the percentage, then transfer again                          | How quickly the new percentage applies to the next transfer                                                                                             |
| 6   | Set the percentage to 0% (never remove the split)                   | Transfers then settle wholly to the school, minus Paystack's fee                                                                                        |
| 7   | A split group with the school as fee bearer, on a dedicated account | Is the fee-bearer setting honoured on transfers?                                                                                                        |
| 8   | Card checkout with a flat platform charge, then with a zero charge  | Is a zero charge accepted? Who bears the fee?                                                                                                           |
| 9   | List transactions and match them to stored payments                 | Enough for the nightly reconciliation?                                                                                                                  |

**What test mode cannot answer:** real banks' timing, refunds and chargebacks on split
payments, payouts to a real school account, the BVN prompt (it depends on the business
category, set at registration), and how Paystack behaves at the 1,000-account limit. These
stay with Paystack's **written confirmation**, a founder task, and the pilot.

## What is kept

The provider interface and Paystack adapter, the webhook verification and inbox pattern,
and the evidence: written up in `docs/spikes/04-paystack.md` and drafted as the ADR that
section 25.1 requires (`docs/adr/0005-paystack-split-behaviour.md`), marked **unconfirmed**
until Paystack confirms in writing.

## Not in this spike

Allocation to invoices, receipts, the unmatched queue, bank-statement import, payouts,
moving payments, refunds, Monnify, direct debit, the platform-fee ledger, and anything in
live mode.

## Permissions

None change. The spike has no sign-in; its test school and families are made up.

## Threat model (STRIDE)

| Threat                 | Example                                           | Mitigation tested in the spike                                                                      |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Spoofing               | A forged webhook says a family paid               | Signature checked on the raw body, constant-time; anything else gets 401                            |
| Tampering              | A real webhook replayed later                     | Rejected if its timestamp is more than 300 seconds off; the inbox is unique on Paystack's reference |
| Tampering              | Our code removes a split and payments go to Akoso | The provider has no such method; a test fails if the endpoint appears anywhere in our code          |
| Repudiation            | A payment with no trace of what Paystack sent     | Every raw event stored before processing                                                            |
| Information disclosure | Secret keys in logs, errors or the repository     | Keys only in `.env.local` (never committed), validated at start-up, never logged                    |
| Denial of service      | A flood of webhook calls                          | The endpoint only verifies and stores; the work happens later                                       |
| Elevation of privilege | A live key used by mistake                        | The adapter refuses keys that are not test keys during the spike                                    |

## Acceptance criteria

- Every scenario above has a written answer with evidence (event IDs, amounts in kobo,
  timings), or a clear "test mode cannot show this".
- A webhook delivered twice creates one stored payment; a replayed or forged one is rejected.
- No code path can remove a split from a dedicated account (tested).
- The ADR draft records what was observed, marked unconfirmed.
- `pnpm check` and CI pass, with no key in the repository or the logs.

## Needs from you

**Now:** approve this spec, and choose how webhooks reach this computer (question below).

**Before building starts** (the spike asks for these at the right moment):

1. A **Paystack account** (free; test mode works without company registration, apart from
   the open question about dedicated accounts).
2. From the Paystack dashboard, in **test mode**: the **secret key** (`sk_test_…`), the
   **public key** (`pk_test_…`), and a **webhook signing secret** (`whsec_…`).
3. You put them into `apps/web/.env.local` yourself, a file Git ignores. Please **don't
   paste keys into this chat**. I'll give you the exact lines to add.
4. Turning on subaccounts, splits and dedicated accounts if the dashboard says they are off.

## Open question for you

**How should Paystack's test webhooks reach this computer?**

- **A temporary tunnel (recommended):** Cloudflare's `cloudflared` "quick tunnel" gives
  this computer a random public HTTPS address for as long as it runs, with no account. It
  would forward only the webhook route, during spike sessions, and be closed after. It means
  downloading `cloudflared` from Cloudflare's official releases. Tests real delivery,
  signatures and retries end to end.
- **No tunnel:** read events through Paystack's event-history API and verify signatures
  on events we sign ourselves. Nothing is exposed, but real delivery and Paystack's own
  signatures are not tested until staging exists.
