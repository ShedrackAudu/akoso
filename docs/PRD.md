# Akoso: Product Requirements

What we are building and why, in product language. The full brief is
`docs/MASTER_PROMPT.md` (split by section in `docs/brief/`); if this document and the
brief disagree, the brief wins and the difference is a bug. Section numbers below refer
to the brief.

**Status:** draft for founder review at the section 3.2 checkpoint.

## 1. The problem

A Nigerian private school runs on loose threads: fees, results, attendance, staff and
parents, each kept in a different notebook, spreadsheet or app. Two of those threads cost
proprietors sleep:

- **Fees.** Parents pay into the school's bank account by transfer. The bursar matches
  each alert to a child by hand, parents send screenshots as proof, and nobody can say
  with confidence who has paid.
- **Report cards.** Totals, grades and class positions are computed by hand or in
  fragile spreadsheets at the end of every term. One wrong position on one report card
  damages the school's name with that family.

Existing school systems (Edves, SchoolTry, SAFSMS and others) offer long module lists.
Schools still reconcile fees by hand and still check report cards by hand.

## 2. The product

Akoso is the operating system for modern Nigerian schools: it gathers fees, results,
attendance, staff and parents into one system, so a school can be run from any Android
phone, even on a weak connection.

**Promise:** order and visibility across the whole school, every day.

**Market:** private nursery, primary and secondary schools (Nursery, Primary, JSS, SSS)
in Nigeria. West Africa later; nothing is built for other countries now, and nothing is
hard-coded that would block them.

### The two things Akoso must do better than anyone

1. **Fees that reconcile themselves.** Every family gets its own fees account number.
   Any transfer into it is matched to the right child and invoice automatically, and the
   parent gets a receipt within a minute.
2. **Correct Nigerian report cards in minutes.** Teachers enter scores on a phone,
   online or offline. Akoso computes totals, grades and positions exactly and produces
   print-ready report cards in bulk.

Everything else only needs to be good enough: reliable, simple and correct. We do not
compete on the number of modules.

Akoso never publishes a result, receipt or balance that it cannot trace back to stored
records.

## 3. Who uses it

| Person                    | What they need from Akoso                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Proprietor                | To know the state of the school at a glance: fees expected and collected, results progress, attendance |
| Group owner               | The same across several branches                                                                       |
| School administrator      | To set the school up, keep records in order and publish results                                        |
| Bursar                    | To see who has paid without matching bank alerts by hand                                               |
| Head teacher or principal | Results that are correct before they sign them                                                         |
| Vice principal            | Whatever the head teacher delegates                                                                    |
| Teacher                   | To enter scores, take the register and write comments on a phone, with or without a connection         |
| Safeguarding lead         | Restricted pastoral notes, custody restrictions and alerts                                             |
| School nurse              | Health records and sick-bay visits                                                                     |
| Accountant or auditor     | A read-only view of the school's finances                                                              |
| Gate or front-desk staff  | To check quickly who may collect a child                                                               |
| Parent or guardian        | Their own children's fees, results, attendance and news, on their phone                                |
| Akoso team                | To onboard and support schools without seeing children's records by default                            |
| Agent                     | Their own referrals and commissions, nothing else                                                      |

Students do not have accounts in the core product; parents see everything. Student
accounts are an optional later module (Akoso Student).

Schools can also build their own roles (for example "Exams officer") from the same set
of permissions.

## 4. What users must be able to do

- Set up a school in under 45 minutes using Nigerian presets.
- Import students, guardians, staff, opening balances and past scores from Excel or
  another school system.
- Enter continuous assessment and exam scores, and publish report cards.
- Invoice fees, collect payments by bank transfer or card, and track debtors.
- Message parents by in-app notice, WhatsApp, SMS and email.
- Run daily operations: attendance, homework, lesson notes, behaviour, health and
  pickup safety.
- Manage admissions, payroll, expenses and several branches.
- Roll over to a new session with promotion, repeats and graduation.
- Get help inside the app without phoning us.
- Export all their data at any time, including after they leave.

## 5. Features

### Part 1: the core platform (what we launch)

Product-family names are fixed (section 4.0) and are used in navigation, plans and help.

| Area              | Features                                                                                                                                                                                                                   | Brief |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Setup**         | Onboarding wizard; sessions, terms and the school calendar; levels, classes and arms; subject presets for both the old and the 2025 curriculum; assessment and grading schemes; position settings; traits; nursery rubrics | 8     |
| **Setup**         | Student, guardian, family and staff records; billing accounts (who pays, including sponsors and split payers); custody restrictions; ID cards                                                                              | 9     |
| **Setup**         | Excel and CSV import with mapping, a dry run, rollback within 7 days and assisted migration                                                                                                                                | 10    |
| **Akoso Reports** | Score sheets with an approval workflow; the results engine; comments and traits; AI comment drafts; mid-term reports; broadsheets                                                                                          | 11    |
| **Akoso Reports** | Report cards per level, bulk PDFs, publishing with an optional fee gate; transcripts, testimonials, leaving certificates; QR verification                                                                                  | 12    |
| **Akoso Pay**     | Fee items of every kind, discounts, write-offs, bulk invoice runs, arrears, instalment plans, family statements                                                                                                            | 13    |
| **Akoso Pay**     | Fees accounts, automatic matching and receipts, card checkout, cash entry, bank-statement import, payout matching, moving a payment to the right family, refunds and disputes, cash-up, the debtor dashboard, reminders    | 14    |
| **Akoso Staff**   | Payroll under the Nigeria Tax Act 2025, payslips, remittance schedules, a parallel-run mode                                                                                                                                | 15    |
| **Expenses**      | Expense categories, approvals, a simple cashbook, accountant exports                                                                                                                                                       | 16    |
| **Akoso Parent**  | One messaging service: in-app and push, WhatsApp, SMS, email; templates; broadcasts with a cost preview; message credits; announcements, events, permission slips, PTA booking, parent-teacher messages                    | 17    |
| **Akoso Parent**  | The parent experience in the Akoso app: balances, the fees account number, results, attendance, homework, absence reports, collectors                                                                                      | 18    |
| **Akoso Staff**   | The teacher workspace: classes, register, score entry, comments, homework, lesson notes                                                                                                                                    | 19    |
| **Platform**      | Offline mode for score entry, attendance and trait ratings                                                                                                                                                                 | 20    |
| **Akoso Prefect** | Student and staff attendance, staff leave, behaviour, sick bay, pickup safety and gate passes                                                                                                                              | 21    |
| **Setup**         | Session rollover: promotion, repeats, graduation, balances carried forward                                                                                                                                                 | 21    |
| **Akoso Admit**   | A public application page, the admissions pipeline, entrance exams, offers, one-click enrolment                                                                                                                            | 22    |
| **Akoso Insight** | Proprietor and group dashboards, the termly business review, early warning, standard reports, government and exam exports, the full data export                                                                            | 23    |
| **Platform**      | Subscriptions priced per active student per term; Akoso's fee collected automatically from fee payments, with a direct-debit backstop                                                                                      | 25    |
| **Platform**      | The platform admin for the Akoso team: schools, leads, sign-up approvals, consented support sessions, health alerts, emergency switches, the school exit process; the agent portal                                         | 26    |
| **Platform**      | Sign-in for parents (phone and one-time code) and staff (password and MFA); roles and custom roles; one app at one address with a school picker                                                                            | 6, 7  |
| **Platform**      | The consent ledger, data subject requests, retention settings and the other privacy features                                                                                                                               | 29    |
| **Platform**      | The Expo mobile app foundation only (sign-in, read-only home screens, push)                                                                                                                                                | 5     |

One app, named simply "Akoso", serves parents and staff at one address. After sign-in
it shows the experience for the person's role, and someone with two roles switches
without signing out.

### Part 2: optional modules (not started until the founder says so)

Timetable, student accounts (Akoso Student), computer-based tests, store, transport,
hostel, library and visitor log (sections 35–44). The core data model is designed so
each can be added later without reworking core tables.

## 6. Key acceptance criteria

The full list is in each brief section. The ones that define success:

| Area          | Criterion                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Setup         | A new school is configured in under 45 minutes; the schemes of 5 real pilot schools are configurable without code                                                                                                  |
| Import        | A 600-student school with 5% bad rows imports cleanly in under a day with our help, with every error explained                                                                                                     |
| Results       | The engine reproduces real report cards and broadsheets from 5 schools exactly; 600 report cards in under 10 minutes                                                                                               |
| Score entry   | A class of 45 is entered on a phone in under 10 minutes; 300 scores and a register entered in airplane mode sync with nothing lost and nothing duplicated                                                          |
| Payments      | A webhook delivered twice creates exactly one payment; no kobo is ever created or lost; at least 95% of transfers match automatically in the pilot; 100 simultaneous payments get 100 receipt numbers with no gaps |
| Parents       | Sign-in with a one-time code completes within 60 seconds on a slow connection; the parent experience loads in under 200 KB                                                                                         |
| Payroll       | A parallel run against two schools' payroll matches to the naira, or every difference is explained                                                                                                                 |
| Tenancy       | Automated tests prove, for every table, that one school cannot read or change another's data                                                                                                                       |
| Phones        | Every feature works on a 2 GB Android phone on a throttled 3G connection                                                                                                                                           |
| Accessibility | WCAG 2.2 AA across the web app and PWA                                                                                                                                                                             |

### Launch go/no-go (section 32.1)

5–8 pilot schools have completed a third term including cumulative results and rollover;
at least 80% of their parents are activated; bursars report reconciliation time fell
substantially; support median first response is under 2 business hours; no open P1 or P2
bugs; cost per active student is within budget. If the gate fails, the quality bar does
not move: we launch only with schools already on the platform.

## 7. Highest-risk areas

These get extra tests, extra review and the founder's sign-off:

1. Fee auto-matching: one wrong allocation destroys a bursar's trust.
2. Offline score entry with conflict resolution.
3. Third-term cumulative results and promotion, exercised only once a year.
4. Payroll, because of statutory exposure.
5. Automatic collection of Akoso's own fee.

## 8. Out of scope

Not built (section 24): native app features beyond the foundation, an app-store wrapper
of the PWA, GPS bus tracking, biometric device integrations, a full LMS or video
classroom, double-entry accounting, fee lending, a WhatsApp AI chatbot, a school website
builder, USSD channels, full translation of the interface, a cafeteria POS, an alumni
portal, counselling case management, government dashboards, other countries and
white-label versions. The public marketing website has its own brief and is not part of
this build.

Each has something we offer instead, listed in section 24.

## 9. What we never say

Akoso is tamper-resistant and tamper-evident, never "tamper-proof". We do not claim
legal compliance or certification, and we never describe the platform as "fully
compliant" or "error-free".

## 10. Open questions for the founder

Tracked with recommendations in `docs/decisions.md`; risks in `docs/risks.md`.

1. Hosting region, to be chosen from measured latency in Lagos, Abuja and Port Harcourt.
2. The AI provider for comment and lesson-note drafts (Claude or Gemini).
3. Whether section 4.0 of the brief should be updated to match the brand kit (violet
   bead garland) now that it supersedes the indigo, gold and knot direction.
4. Whether "Akoso Parent" gets a warmer name.
5. Pricing, to be validated with pilot schools.
