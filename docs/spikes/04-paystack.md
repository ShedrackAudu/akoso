# Spike 04 result: Paystack in test mode

- **Date:** 11/11/2026 · **Spec:** [stage-1-spike-04-paystack](../specs/stage-1-spike-04-paystack.md)
- **Branch:** `spike/04-paystack`
- **Outcome:** **partly run, then blocked.** Paystack refuses to create dedicated accounts
  and subaccounts for Akoso's account, even in test mode, because it went live as a
  **Starter** (unregistered) business. So the split scenarios, and risk R1, cannot be
  tested until the business is registered and Paystack enables those features. What could
  be tested, real signed webhooks end to end, works.

## In one paragraph

The payment provider, the Paystack adapter and a signed-webhook inbox were built and
tested. Against Paystack's test mode, a real card payment produced a real signed
`charge.success` webhook that crossed a temporary tunnel, passed signature checks and was
stored once; a resend from Paystack and two re-signed redeliveries were each recognised as
repeats. But creating a dedicated account answered `403 Dedicated NUBAN is not available
for your business`, and creating a subaccount `403 Sorry, We cannot add subaccount at the
moment`. Without those, no split can be tried. The test payments also showed that
Paystack is adding its fee on top of what the parent pays, which the brief forbids.

## Scenario results

| #   | Scenario                                                                          | Result                                                                                                                                           |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Create a dedicated account with test keys                                         | **Refused:** `403 Dedicated NUBAN is not available for your business`. The provider list is refused the same way. Creating a customer works      |
| 2   | Transfer into a dedicated account                                                 | **Blocked** (no dedicated account)                                                                                                               |
| 3   | Same event twice; old event replayed                                              | **Passed**, with a real card payment's event instead of a transfer (below)                                                                       |
| 4–7 | Splits on dedicated accounts: percentage, changing it, 0%, split group fee bearer | **Blocked:** creating a subaccount is refused (`403 Sorry, We cannot add subaccount at the moment`, twice). Listing subaccounts and splits works |
| 8   | Card checkout with a flat platform charge                                         | **Partly:** a plain checkout works; with a subaccount it cannot be tried (no subaccount)                                                         |
| 9   | List transactions for reconciliation                                              | **Passed:** references, status, channel, amount, fees and the amount originally requested all come back, with page totals                        |

### Why the account is blocked

Paystack's documentation says dedicated accounts are "only available to registered
businesses… that have successfully completed the go-live process". The founder confirmed
the account went live as a **Starter / individual** business. Subaccounts are evidently
restricted too. The way forward is a founder task, in order:

1. Register the company with CAC (already on the checklist, now needed sooner).
2. Upgrade the Paystack account to a **Registered Business**.
3. Ask Paystack to enable **dedicated accounts, subaccounts and split payments**, in test
   and live mode.

Then scenarios 2 and 4 to 8 can run as written; the code and the inbox are ready for them.

## Webhooks, end to end (passed)

Paystack sent a real `charge.success` for a ₦45,000 test card payment
(reference `AKOSO-SPIKE04-1794427533634`):

- It reached this computer through a temporary Cloudflare quick tunnel (`cloudflared`
  2026.10.7, checksum checked against Cloudflare's published digest). A small gatekeeper
  let only `POST /api/spike/paystack/webhook` through; from the internet, every page
  answered 404. The tunnel was closed afterwards.
- The **`Paystack-Signature`** header (timestamp and HMAC SHA-512 with the webhook signing
  secret) verified, signed by key `whk_adae0f0f`. The endpoint answered 200 in 218 ms;
  Paystack recorded it as **Delivered** on the first try.
- It was stored **once**. A **resend from Paystack** and **two re-signed redeliveries** of
  the same body each got 200 and were counted as repeats; nothing was stored twice.
- Unsigned, tampered, stale and wrongly signed events were refused (401) in local tests,
  and an unsigned call through the tunnel was refused too.

## Findings

1. **Paystack is passing its fee to the customer.** The ₦45,000 checkout charged
   **₦45,786.81** (fee ₦786.81, which is 1.5% + ₦100, grossed up), and an abandoned
   ₦150,000 checkout was priced at **₦152,000** (the capped ₦2,000 card fee on top). The
   brief says parents are **never** charged a fee on top; the school bears it (section 14).
   The dashboard setting that passes charges to customers must be **turned off**. A founder
   task.
2. **Paystack's documentation and API disagree in places**, so every call must be tested,
   not copied from the docs:
   - Webhook resend: the docs say the body is `{ "ids": [...] }`; the API wants
     `{ "events": [{ "id", "webhook_url_code" }] }`, and accepts `null` for events sent to
     the dashboard URL.
   - Subaccount creation: the parameter list says `bank_code`, its own example sends
     `settlement_bank` (the adapter sends both until a subaccount can be created).
3. **Webhooks are now signed with a timestamp** (`Paystack-Signature`), which stops
   replays; the older `x-paystack-signature` has none. The inbox uses the new one.
4. **Transaction IDs are numbers** that Paystack says may need 64 bits. The ones seen were
   safe integers, but the adapter keys everything on the string reference.
5. **Webhooks arrive before Akoso knows the school,** so the inbox is a platform table,
   written outside `withTenant()`. The real payments module needs a sanctioned way to do
   that (a narrow `withPlatform()`, or the inbox written by its own role), decided in its spec.
6. **The keys were pasted into the session chat.** They are test keys, so no money is at
   risk, but the test secret key and webhook signing secret should be rolled after the spike.

## What was built (kept)

| Piece                                                                                                                                        | Where                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Payment provider interface, Paystack adapter, fake                                                                                           | `packages/providers/src/payments/`                                                       |
| Webhook signature check (`Paystack-Signature`) and tests                                                                                     | `.../payments/webhook-signature.ts`                                                      |
| **Risk R2 guard:** no way to remove a split; a test fails if the split-removal endpoint appears anywhere in our code (proven by planting it) | `.../payments/port.ts`, `.../payments/paystack.test.ts`                                  |
| Webhook inbox, stored once, repeats counted (spike tables)                                                                                   | `packages/core/src/payments/spike/inbox.ts`, `packages/db/src/spike/paystack-schema.sql` |
| Webhook endpoint (thin wrapper)                                                                                                              | `apps/web/app/api/spike/paystack/webhook/route.ts`                                       |

## Not done, and why

- The **ADR for section 25.1** (Paystack split behaviour): there is no split evidence to
  record yet. It is written when scenarios 4 to 8 run.
- Refunds, chargebacks, payouts and the 1,000-account limit: outside test mode, as the
  spec said, and still need Paystack's written confirmation.

## Effort

One working session against an estimate of 12 hours, stopped early by the block. The
rest waits for the founder's Paystack changes.
