# payments

Dedicated (fees) accounts, the webhook inbox, allocation, gapless receipts, the unmatched queue, bank-statement import, payout matching, moving payments, refunds, disputes, cash-up and debtor reporting.

- **Product name:** Akoso Pay
- **Brief:** section 14 (`docs/brief/`)
- **Main entities:** virtual_accounts, payment_events, payments, payment_allocations, unmatched_payments, receipt_counters, receipts, payment_moves, bank_statement_imports, bank_statement_lines, payouts, payout_items, refunds, disputes
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                 |
| -------------- | ------------------------------------ |
| Use cases      | `packages/core/src/payments/`        |
| Tables and RLS | `packages/db/src/schema/payments.ts` |
| Zod schemas    | `packages/schemas/src/payments.ts`   |

**Status:** placeholder. Nothing is implemented yet.
