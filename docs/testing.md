# Testing

How to run every test suite locally (brief section 30). A suite is added to this page
in the same pull request that adds it.

## What runs today

| Check             | Command                                                | What it proves                                                                                                                                            |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | `pnpm test`                                            | Vitest. Today: the environment validation tests, plus one placeholder (`it.todo`) per module that names the brief section it will cover                   |
| Database tests    | `pnpm test:db`                                         | Needs `docker compose up -d`. Today: spike 01's tenant-isolation, pooler, platform-read and query-plan tests (40)                                         |
| Browser tests     | `pnpm test:e2e`                                        | Needs `docker compose up -d`. Builds the web app, starts it on port 3200 and runs Playwright on a Pixel 5 screen. Today: spike 02 nine offline-sync tests |
| One file          | `pnpm vitest run packages/core/src/config/env.test.ts` |                                                                                                                                                           |
| Watch mode        | `pnpm vitest`                                          |                                                                                                                                                           |
| Types             | `pnpm typecheck`                                       | Strict TypeScript in every app and package                                                                                                                |
| Lint              | `pnpm lint`                                            | ESLint with type-aware strict rules, zero warnings, and the icon-library ban                                                                              |
| Import boundaries | `pnpm boundaries`                                      | The layer and module rules in `.dependency-cruiser.cjs`; no circular imports                                                                              |
| Unused code       | `pnpm unused`                                          | No unused files, exports or dependencies (knip)                                                                                                           |
| Formatting        | `pnpm format:check`                                    | Prettier                                                                                                                                                  |
| All of the above  | `pnpm check`                                           |                                                                                                                                                           |
| Build             | `pnpm build`                                           | The web and admin apps build                                                                                                                              |

CI (`.github/workflows/ci.yml`) runs all of these on every pull request, plus a secret
scan (gitleaks). The database tests run in their own job, against the same Docker
services as local development.

Test files sit beside the code they test, named `*.test.ts`. Tests that need the
database are named `*.db.test.ts`, so `pnpm test` skips them and `pnpm test:db` runs them.

## Suites still to come

None of these exists yet. Each is built with the stage that needs it.

| Suite                               | What it covers                                                                                                                                                                                                                                                                | Tool                                                 | Stage                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| **Tenant isolation**                | For every table: tenant A cannot read, insert, update or delete tenant B's rows; also through the API and file downloads. Enumerates tables from the database catalogue so a new table cannot be missed                                                                       | Vitest + Postgres                                    | 1                                       |
| **Authorisation**                   | Generated from `docs/permissions.md` for every role and action                                                                                                                                                                                                                | Vitest                                               | 1                                       |
| **Authentication**                  | OTP, MFA, lockout, session rotation, password reset                                                                                                                                                                                                                           | Vitest, Playwright                                   | 1                                       |
| **Time zones**                      | Payments, registers, cash-ups and scheduled messages around midnight WAT land on the right day, term and report                                                                                                                                                               | Vitest                                               | 1 onwards                               |
| **Imports**                         | Malformed files, duplicates, rollback, saved mappings                                                                                                                                                                                                                         | Vitest                                               | 2                                       |
| **Offline sync**                    | Queued operations, conflicts, no data loss                                                                                                                                                                                                                                    | Vitest, Playwright                                   | 2, 3                                    |
| **Results engine (golden files)**   | Real, anonymised report cards and broadsheets from 5 schools, reproduced exactly: ties, absent and exempt students, missing CA, mid-term transfers, nursery rubrics, third-term cumulative averages                                                                           | Vitest                                               | 3                                       |
| **PDF generation**                  | Each template renders correctly; size and time limits                                                                                                                                                                                                                         | Vitest + Gotenberg                                   | 3                                       |
| **Fee allocation (property-based)** | Random invoices, discounts, part payments, overpayments, sibling splits, refunds, reversals. Invariant: no kobo is created or lost                                                                                                                                            | Vitest + a property-testing library (to be approved) | 4                                       |
| **Payments**                        | Webhook signatures, duplicate and out-of-order webhooks, nightly reconciliation, the unmatched queue, DVA creation, provider fees, bank-statement re-upload, payout matching, moving payments, shared payers, write-offs, gapless receipt numbers under simultaneous payments | Vitest + Postgres                                    | 4                                       |
| **Messaging**                       | Fallback, credits debited only on delivery, quiet hours                                                                                                                                                                                                                       | Vitest                                               | 5                                       |
| **Accessibility**                   | Automated checks on every screen, plus a manual keyboard and screen-reader pass on key flows                                                                                                                                                                                  | axe with Playwright                                  | 1 onwards                               |
| **End-to-end**                      | Setup wizard; score entry to published report card; invoice to payment to receipt; parent sign-in and payment. Mobile viewport, throttled to 3G, low-end Android emulation                                                                                                    | Playwright                                           | 2 onwards                               |
| **Payroll**                         | PAYE, pension and NHF against an accountant's worked examples                                                                                                                                                                                                                 | Vitest                                               | 6                                       |
| **Platform-fee ledger**             | No overshoot on cards; the percentage switch never removes a split; the backstop debit                                                                                                                                                                                        | Vitest                                               | 7                                       |
| **Session rollover**                | Promotion, balances carried forward, reversal                                                                                                                                                                                                                                 | Vitest                                               | 8                                       |
| **Load**                            | Results week (600 report cards per school, many schools at once) and resumption week (1,000 webhooks a minute)                                                                                                                                                                | k6                                                   | Before the pilot gate and before launch |
| **Security**                        | A test for each OWASP Top 10 category that can be tested; SAST, dependency, container and dynamic scans                                                                                                                                                                       | Semgrep, CodeQL, OSV-Scanner, Trivy, OWASP ZAP       | 1 onwards                               |

## Rules

- **Never weaken a test to make it pass.** Golden fixtures change only with the
  founder's explicit approval.
- **Never use real children's data.** Golden files are anonymised by a script before
  they enter the repository; raw files never do (`golden-raw/` is gitignored as a
  safeguard) and are deleted once anonymised.
- Include negative tests and malformed input for every endpoint.
- Use local fixtures, provider test modes and simulated webhooks. Tests never call a
  live provider.
- Pure logic in `packages/domain` is tested exhaustively, with no database.
- Tests that need Postgres use the local Docker Compose database.
