## 32. Build order and checkpoints

Build in this order. There are no calendar dates: do not start a stage until I approve the checkpoint before it. Part 2 modules are not part of this plan.

| Stage | Build | Checkpoint (I review before you continue) |
| --- | --- | --- |
| 1. Foundations | **First:** project documents, brief split, hard-questions review and full scaffold (3.2), approved before feature code. Then architecture spikes (RLS, offline, Gotenberg, Paystack dedicated accounts and split payments in test mode). Monorepo, Docker Compose, CI/CD, environments, shadcn preset with skill and MCP (4.2), service layer and /api/v1 conventions (5.1), auth, roles (including custom roles and Akoso team roles, 26.2), tenancy with RLS, the single app address (section 7), time-zone handling (3.1), audit log, feature flags | PRD, architecture documents, brief split, risks list, `AGENTS.md` and scaffold approved. Decision log signed (Next.js stays, one dedicated account per billing account, hosting region). Tenant-isolation tests pass on every table; login with OTP and MFA works |
| 2. School structure and people | Onboarding wizard, NERDC presets and subject limits, schemes, school calendar, traits, students, guardians, families, billing accounts, custody restrictions, staff, import and migration, offline framework | A real (anonymised) school list imports cleanly; setup takes under 45 minutes. **Velocity check:** actual vs estimated effort ≤ 1.2×, otherwise I defer items from the cut-line |
| 3. Results and report cards | Score sheets (online and offline), results engine, comments, traits, broadsheets, mid-term and end-of-term report cards, bulk PDFs, snapshots, publishing, teacher workspace | RLS suite green; golden files from 5 schools collected and anonymised. **Results gate:** 100% golden-file match; 600 report cards in under 10 minutes |
| 4. Fees and payments | Fee items (all types), discounts, write-offs, invoicing, instalments, Paystack subaccounts and dedicated accounts, webhooks, allocation engine, unmatched queue, bank-statement import, payout matching, moving payments, gapless receipts, refunds and disputes, cash-up, debtor dashboard; AI comment drafts | Property tests pass; webhook replay creates no duplicates; live test transfers settle to a test school; a re-uploaded bank statement creates no duplicates. **Results production-ready** for a real term's report cards |
| 5. Parents, messaging and admissions | Parent PWA and activation pack, messaging service (push, WhatsApp, SMS, email), credits, reminders, announcements and permission slips, consent ledger, data export, proprietor dashboard, platform admin (including leads, sign-up approvals, public demo, plan information, emergency switches and announcements to schools), in-app onboarding and help (26.1), student attendance and parent absence reports, admissions | **Shadow pilot results:** ≥ 2 schools publish real report cards from the platform; head teachers sign off that they are correct; no P1 incident during results week. **Pilot readiness gate:** every core feature except rollover and subscription billing is production-ready; dedicated-account auto-match ≥ 95%; zero discrepancies after a webhook replay test; load test and security review done; restore drill passed; DPIA complete; pre-launch security checklist (28.4) passed |
| 6. Operations and safeguarding | Staff attendance and leave, behaviour and health, pickup safety, ID cards, homework, lesson notes, AI drafts, payroll, expenses | Payroll parallel run matches a pilot school's payroll for the same month |
| 7. Growth and management | Group/multi-branch, government and exam exports, early warning, subscription billing and automatic platform-fee collection (25.1), the founder's dashboard (26.3), agents and referrals with the agent portal (26.4), events (RSVP) and PTA scheduling, transcripts, testimonials and leaving certificates, custom domains (7.1), native mobile app foundation (5.2) | Billing computes a test school's term fee correctly, and the platform fee is collected automatically in Paystack test mode (cards, dedicated accounts and the direct-debit backstop) |
| 8. Session rollover and hardening | Promotion and rollover wizard run with every pilot school; the school exit process (26.7); performance, security review, load tests, accessibility, documentation | **Launch go/no-go:** see 32.1 |
| 9. Launch readiness | Fix pilot findings first; then any core items deferred from the cut-line; status page, on-call rota and runbooks finalised. No Part 2 work | Feature freeze; launch readiness review |

Repeat the velocity check at the end of every stage.

Pilots, by school term rather than by date:

- **Shadow pilot (one term):** 2–3 design-partner schools of different types (a nursery/primary, a secondary, ideally a mixed school of 400–800 students) run results on the platform alongside their current method, importing their previous term's scores. The next term's fee invoices go out through dedicated accounts before resumption.
- **Full pilot (the following term, ideally a third term):** 5–8 schools in one city cluster run fees, results, parents and daily operations fully on the platform. A third term tests cumulative results and session rollover, which happen only once a year.
- No production deploys during any pilot school's results week or resumption week.

### 32.1 Launch go/no-go criteria

- 5–8 pilot schools completed a third term on the platform, including cumulative results and rollover.
- ≥ 80% of parents in pilot schools activated on the PWA or WhatsApp.
- Bursars report that reconciliation time fell substantially (baseline vs pilot).
- Support median first response under 2 business hours.
- No open P1 or P2 bugs.
- Cost per active student within budget.

If the gate fails, we launch only with schools already on the platform and onboard new schools from the start of the next term. The quality bar does not move.

### 32.2 External dependencies (I handle these; build so you are not blocked by them)

The full list of my tasks, by stage, is in `docs/founder-checklist.md` (rule 15). The table below covers those that affect what you build.

| Dependency | Needed for | Until it arrives |
| --- | --- | --- |
| Company registration (CAC) and TIN | Paystack live mode, legal templates | Test mode only |
| Paystack registered-business KYC and go-live, business category set to education/software (so parents need no BVN), subaccounts, split payments, Direct Debit, and a dedicated-account limit increase (request before onboarding the second school) | Live dedicated accounts and automatic platform-fee collection | Paystack test mode and the development adapter |
| Paystack's written confirmation of split behaviour (section 25.1, "Verify before relying on it") | Automatic platform-fee collection | Build behind a feature flag; collect test-mode evidence |
| A short opinion from a Nigerian fintech lawyer that the split design keeps Akoso outside CBN payment licensing | Live platform-fee collection | Test mode only |
| Accountant's advice on VAT registration (the threshold is disputed: ₦50m or ₦100m turnover), withholding tax and e-invoicing | Live billing | VAT off; rates stored as data |
| Termii DND sender ID approval | Live transactional SMS | Sandbox/log-only SMS adapter |
| Meta Business verification and WhatsApp template approval | Live WhatsApp | Log-only WhatsApp adapter; SMS fallback |
| NDPC registration (likely Ultra-High Level), DPO/DPCO, annual audit return by 31 March | Launch | Templates and DPIA drafts in `docs/legal-templates/` |
| Accountant sign-off on tax and statutory rates | Payroll go-live | Seeded values marked "to be verified" |
| Golden files (report cards, broadsheets, fee schedules) from 5 schools | Results gate | Synthetic fixtures, replaced as files arrive |

### 32.3 Ranked cut-line

Part 2 modules are already outside the launch plan. If a core stage runs late, defer from the top of this list first (deferred items are built after launch, still as part of Part 1, before any Part 2 work):

1. Agent and referral tracking (handled manually instead)
2. PTA scheduling (keep announcements)
3. Staff attendance and leave
4. Sponsor screens for billing accounts (keep the data model; handle sponsors manually)
5. Group/multi-branch screens (keep the data model)

Never cut: core results, fees and reconciliation tests, session rollover, tenancy, security, automatic platform-fee collection with its backstop, or quality in stages 1–5.

