# Brief index

The Akoso brief (`docs/MASTER_PROMPT.md`) split into one file per section, unchanged.
Load only the sections you need for the current task (working rule 13).

- **Source of truth:** `docs/MASTER_PROMPT.md`. If a file here ever disagrees with it, the master prompt wins and the difference is a bug.
- **Do not edit these files by hand.** Change the master prompt, then regenerate them with the split script (see `AGENTS.md`), in the same pull request.
- Joining these files in order reproduces the master prompt byte for byte. Because of that, the `# Part 1` heading sits at the end of file 00 and the `# Part 2` heading at the end of file 34.
- Subsections stay with their parent (e.g. 3.1–3.3 are in file 03, 25.1 in file 25, 28.1–28.4 in file 28).

## Part 1: Core platform

| Section | File |
| --- | --- |
| — | [Introduction, how the brief is organised, and key terms](00-introduction-and-key-terms.md) |
| 1 | [Product vision](01-product-vision.md) |
| 2 | [Technology stack](02-technology-stack.md) |
| 3 | [Working rules for AI coding agents](03-working-rules-for-ai-coding-agents.md) |
| 4 | [Design and branding](04-design-and-branding.md) |
| 5 | [Native mobile app foundation (React Native + Expo)](05-native-mobile-app-foundation.md) |
| 6 | [Authentication, users and roles](06-authentication-users-and-roles.md) |
| 7 | [Multi-tenancy](07-multi-tenancy.md) |
| 8 | [School setup and academic structure](08-school-setup-and-academic-structure.md) |
| 9 | [Students, guardians, families and staff](09-students-guardians-families-and-staff.md) |
| 10 | [Data import and migration](10-data-import-and-migration.md) |
| 11 | [Results engine](11-results-engine.md) |
| 12 | [Report cards, transcripts and testimonials](12-report-cards-transcripts-and-testimonials.md) |
| 13 | [Fees and invoicing](13-fees-and-invoicing.md) |
| 14 | [Payments and automatic reconciliation](14-payments-and-automatic-reconciliation.md) |
| 15 | [Payroll](15-payroll.md) |
| 16 | [Expenses and cashbook](16-expenses-and-cashbook.md) |
| 17 | [Communication](17-communication.md) |
| 18 | [Parent app](18-parent-app.md) |
| 19 | [Teacher workspace](19-teacher-workspace.md) |
| 20 | [Offline mode](20-offline-mode.md) |
| 21 | [Daily operations and safeguarding](21-daily-operations-and-safeguarding.md) |
| 22 | [Admissions](22-admissions.md) |
| 23 | [Dashboards, reports and exports](23-dashboards-reports-and-exports.md) |
| 24 | [Out of scope](24-out-of-scope.md) |
| 25 | [Subscriptions and billing (our revenue)](25-subscriptions-and-billing.md) |
| 26 | [Platform administration](26-platform-administration.md) |
| 27 | [Database design](27-database-design.md) |
| 28 | [Application security](28-application-security.md) |
| 29 | [Privacy and NDPA compliance readiness](29-privacy-and-ndpa-compliance-readiness.md) |
| 30 | [Testing](30-testing.md) |
| 31 | [DevOps and operations](31-devops-and-operations.md) |
| 32 | [Build order and checkpoints](32-build-order-and-checkpoints.md) |
| 33 | [Deliverables](33-deliverables.md) |
| 34 | [Definition of done](34-definition-of-done.md) |

## Part 2: Optional modules (do not build until instructed)

| Section | File |
| --- | --- |
| 35 | [Rules for Part 2](35-rules-for-part-2.md) |
| 36 | [Timetable](36-timetable.md) |
| 37 | [Computer-based tests (CBT)](37-computer-based-tests.md) |
| 38 | [Store (uniform and bookshop)](38-store.md) |
| 39 | [Transport](39-transport.md) |
| 40 | [Hostel and boarding](40-hostel-and-boarding.md) |
| 41 | [Library](41-library.md) |
| 42 | [Visitor log](42-visitor-log.md) |
| 43 | [Student accounts (Akoso Student)](43-student-accounts.md) |
| 44 | [Part 2 definition of done](44-part-2-definition-of-done.md) |
