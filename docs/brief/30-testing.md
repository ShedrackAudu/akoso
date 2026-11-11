## 30. Testing

Create automated tests for:

- **Results engine (golden files):** real anonymised report cards and broadsheets from 5 schools, covering ties, absent and exempt students, missing CA, mid-term transfers, nursery rubrics and third-term cumulative averages. The engine must reproduce them exactly. Golden files hold real children's data until anonymised: run them through an anonymisation script (names, admission numbers, photos and contacts replaced consistently) before they enter the repository, keep raw files out of the repository and shared drives, and delete them once anonymised.
- **Fee allocation (property-based):** randomly generated invoices, discounts, part payments, overpayments, sibling splits, refunds and reversals. Invariant: no kobo is created or lost.
- **Tenant isolation:** for every table, tenant A cannot read, insert, update or delete tenant B's rows; also through the API and file downloads.
- **Authorisation:** tests generated from the permissions matrix for every role and action.
- **Authentication:** OTP, MFA, lockout, session rotation, password reset.
- **Payments:** webhook signature verification, duplicate and out-of-order webhooks, nightly reconciliation, unmatched queue, DVA creation, provider fees, bank-statement import (no duplicates on re-upload), payout matching, moving payments, shared payers, write-offs, gapless receipt numbers under simultaneous payments, and the platform-fee ledger (no overshoot on cards, the percentage switch never removes a split, the backstop debit).
- **Imports:** malformed files, duplicates, rollback, saved mappings.
- **Offline sync:** queued operations, conflicts, no data loss.
- **PDF generation:** report cards render correctly for each template; size and time limits.
- **Payroll:** PAYE, pension and NHF calculations against worked examples from an accountant.
- **Session rollover:** promotion, balances carried forward, reversal.
- **Messaging:** fallback, credits debited only on delivery, quiet hours.
- **Time zones:** payments, registers, cash-ups and scheduled messages around midnight WAT land on the right day, term and report.
- **Accessibility:** automated checks (e.g. axe) on every screen in CI, plus a manual keyboard and screen-reader pass on key flows before each pilot and before launch.
- **End-to-end (Playwright):** setup wizard, score entry to published report card, invoice to payment to receipt, parent login and payment, on a mobile viewport throttled to 3G with low-end Android emulation.
- **Load (k6):** results week (600 report cards per school, many schools at once) and resumption week (1,000 webhooks per minute). Run before the pilot readiness gate and before launch.

Include negative tests and malformed input for every endpoint. Use local fixtures, provider test modes and simulated webhooks. Never use real children's data in tests. Document how to run every test suite locally in `docs/testing.md`.

