# Stage 1 checkpoint: Foundations

- **Status:** Approved (founder, 13/11/2026), as recommended: both decisions signed (D-32, D-33 with its condition), and the four recommendations accepted (D-34)
- **Brief:** section 32, Stage 1 row
- **What approval means:** Stage 2 (school structure and people) may start. Nothing in
  Stage 2 starts until this is approved.

## The checkpoint, item by item

The brief's Stage 1 checkpoint has three parts.

### 1. Documents approved

**Met (11/11/2026).** You approved the PRD, the architecture documents, the brief split,
the risks list, `AGENTS.md` and the scaffold at the section 3.2 checkpoint. ADRs 0001 and
0002 are accepted.

### 2. Decision log signed

The brief names three decisions to sign at this checkpoint:

| Decision                                      | Where it stands                                                                                                                                                                                                                                                            | To sign                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Next.js stays**                             | ADR 0001 left it for this checkpoint. Everything built so far is Next.js 16 (App Router), and nothing has argued against it                                                                                                                                                | **Yes**                   |
| **One dedicated account per billing account** | The architecture's design (`ARCHITECTURE.md`): each family's billing account gets one Paystack dedicated account for school fees. **Not yet proven:** spike 04 could not test dedicated accounts or splits, because Paystack refuses them to a Starter business (R1, D-14) | **Yes, with a condition** |
| **Hosting region**                            | Signed 12/11/2026: Render, Frankfurt (D-18)                                                                                                                                                                                                                                | Done                      |

**I recommend signing the second one now, on condition** that spike 04's split scenarios
pass before Stage 4 (fees and payments) starts. Stages 2 and 3 don't touch payments, so
nothing waits on Paystack until then. If the scenarios fail, the design changes in
Stage 4's spec, not here.

### 3. Tests the brief asks for

| Test                                       | Result                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant isolation on every table**        | **Passes.** The suite reads the database to find every table with a school column, so a new table can't be missed. It checks forced row-level security, the policy, indexes and keys, and that one school can't read, insert, change, move or delete another's rows. It also covers the security-log function |
| **Sign-in with a code, and a second step** | **Passes.** Parents sign in by phone code (also on an emulated slow 3G connection, in under 60 seconds); staff with a password and an authenticator app; the Akoso team with passkeys. End-to-end tests cover each                                                                                            |

All of it runs on every pull request: 10 required checks, including 135 database tests
and 49 end-to-end tests in a real browser, plus the security scans (Semgrep, CodeQL,
dependency and container scans, secret scan).

## What Stage 1 built

The Stage 1 row lists the work below. Each item had a spec you approved first.

| Item                                                    | Status                                                                                                                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project documents, brief split, scaffold (section 3.2)  | Done                                                                                                                                                                                      |
| Spike: row-level security with the connection pooler    | Done. Risk R16 closed                                                                                                                                                                     |
| Spike: offline score entry on a real 2 GB Android phone | Done, on a Redmi A2+. Nothing lost or applied twice                                                                                                                                       |
| Spike: report-card PDFs with Gotenberg                  | Done. 600 cards in about 2 minutes, about 61 KB each. Risk R15 closed                                                                                                                     |
| Spike: Paystack dedicated accounts and split payments   | **Partly done, then blocked.** Webhooks work end to end; dedicated accounts and splits wait for the CAC registration and the Paystack upgrade                                             |
| Monorepo, Docker Compose                                | Done                                                                                                                                                                                      |
| CI/CD and environments                                  | **CI done** (checks, security scans, Renovate, signed commits, required checks on `main`). **Staging not deployed yet:** delayed by your decision until there is something to show (D-19) |
| shadcn preset, skill and MCP (section 4.2)              | Done                                                                                                                                                                                      |
| Service layer and `/api/v1` conventions (section 5.1)   | Done                                                                                                                                                                                      |
| Sign-in, roles, custom roles, Akoso team roles          | Done (sign-in parts A and B)                                                                                                                                                              |
| Tenancy with row-level security; the single app address | Done                                                                                                                                                                                      |
| Time zones, audit log, feature flags                    | Done, with platform and school settings                                                                                                                                                   |

## What is not done, and why

1. **Staging.** It's delayed by your choice (D-19), and also needs `akoso.ng` on
   Cloudflare and the Render account (founder tasks). **I recommend deploying it early in
   Stage 2,** so the first school screens are tried on a real address and on real phones,
   not only on this computer.
2. **Paystack split payments (R1).** These need the CAC registration and the Paystack
   upgrade, and are needed before Stage 4.
3. **No cross-model review has run on any security, tenancy or money change** since
   spike 01: you chose to skip each one (D-8 to D-31; one review ran on tenancy, #16 and
   #17). **I recommend one combined review of the sign-in, tenancy and audit code before
   production,** when you have the time.
4. **The screens have no app frame yet:** no header, navigation or shared layout. Each
   page stands alone. **I recommend an app frame as Stage 2's first item,** before more
   screens are built on top.
5. **The parent first-load budget is exceeded** (200 KB asked, 297 KB measured; R14, T13,
   T14). That's for the parent experience in Stage 5, but it's cheaper to fix early.
6. **The velocity numbers can't be checked yet.** Stage 2's checkpoint asks that actual
   effort stays within 1.2 times the estimate. `docs/velocity.md` records each item as
   "one session", not hours. **I recommend recording real hours from Stage 2:** your
   working time per pull request, from spec approval to merge, is enough.

## Open decisions

None blocks Stage 2.

| Decision                                                    | Needed by                        |
| ----------------------------------------------------------- | -------------------------------- |
| D-OPEN-2: AI provider for comment and lesson-note drafts    | Stage 3                          |
| D-OPEN-4: brief section 4.0's wording against the brand kit | Before the brief is next revised |
| D-OPEN-6: changing an assessment scheme after scores exist  | Stage 3                          |
| D-OPEN-7: whether apps may import providers directly        | The first app-side provider use  |

## Founder tasks for the next stages

From `docs/founder-checklist.md`; each is listed once.

| Task                                                                                         | Needed by                         |
| -------------------------------------------------------------------------------------------- | --------------------------------- |
| Register `akoso.ng`, put it on Cloudflare; create the Render account                         | Staging, early in Stage 2         |
| Recruit 2 or 3 design-partner schools; collect golden files from 5 schools                   | Before Stage 3 (the results gate) |
| Register the company (CAC), upgrade Paystack, ask it to enable dedicated accounts and splits | Before Stage 4                    |
| Termii DND sender ID; Meta Business verification and WhatsApp templates (they take weeks)    | Stage 5                           |
| Roll the Paystack test keys that were pasted into a chat                                     | Before the next Paystack work     |

## What Stage 2 is

From the brief: the onboarding wizard, NERDC presets and subject limits, schemes, the
school calendar, traits, students, guardians, families, billing accounts, custody
restrictions, staff, import and migration, and the offline framework. Its checkpoint: a
real (anonymised) school list imports cleanly; setup takes under 45 minutes; and the
velocity check.

I suggest this order to start: the app frame, staging, then school setup (wizard,
academic structure, calendar), then people (students, guardians, families, staff), then
import. Each starts with a spec for your approval.

## To approve

1. Sign **"Next.js stays"**.
2. Sign **"One dedicated account per billing account"**, on condition that spike 04's
   split scenarios pass before Stage 4.
3. Approve the Stage 1 checkpoint, so Stage 2 can start.
4. Optionally, the recommendations above: staging early in Stage 2; the app frame first;
   real hours in the velocity log; one combined cross-model review before production.
