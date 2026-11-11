# billing

Akoso's own revenue: plans, subscriptions, the term census, the platform-fee ledger and split switching, direct-debit mandates, tax rates, agents and referrals.

- **Product name:** Platform
- **Brief:** sections 25, 25.1, 26.4 (`docs/brief/`)
- **Main entities:** plans, subscriptions, subscription_invoices, platform_fee_ledgers, platform_fee_entries, payment_mandates, tax_rates, agents, referrals, agent_commissions, agent_payouts
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                |
| -------------- | ----------------------------------- |
| Use cases      | `packages/core/src/billing/`        |
| Tables and RLS | `packages/db/src/schema/billing.ts` |
| Zod schemas    | `packages/schemas/src/billing.ts`   |

**Status:** placeholder. Nothing is implemented yet.
