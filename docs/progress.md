# Progress: the handoff log

Read this at the start of every session and update it at the end (working rule 13).
Newest session first.

## Where we are

**Stage 1 (Foundations): items 1 to 6 built, and sign-in part B's school side. Akoso
team sign-in (part B, pull request 2) is next, then the Stage 1 checkpoint.**

- Merged on `main`: spikes 01 to 04 (04 partly blocked), CI/CD Part A, the API
  conventions, tenancy (with its review fixes), sign-in part A, and time zones, the
  audit log, flags and settings (#19).
- **Sign-in part B, school side** is on `feat/sign-in-part-b`: custom roles, people with
  access, the security log and access review, backup numbers, number and email changes,
  school-assisted recovery and account deletion.
- Staging (CI/CD Part B) is delayed until there is something to show (D-19).

Feature work goes one spec at a time, in the order below.

## Next

In this order (brief section 32, Stage 1):

1. Architecture spikes, each with a short written result: RLS and `withTenant()` with the
   real connection pooler (**done**: R16 closed, D-7 decided); offline queue on a real 2 GB
   Android phone (R13; **done**, on a Redmi A2+; storage protection not granted); Gotenberg with a realistic report-card template (R15; **done**: 600 cards in 2 minutes, about 61 KB each); Paystack
   dedicated accounts and split payments in test mode (R1; **partly done, then blocked**:
   signed webhooks work end to end and repeats are recognised, but Paystack refuses
   dedicated accounts and subaccounts to a Starter business, so the split scenarios wait
   for the founder's registered-business upgrade; see `docs/spikes/04-paystack.md`).
2. CI/CD and environments: the remaining security scans (T3; **Part A built**: scans,
   Renovate, `SECURITY.md`, latency measurement), staging deploy (Part B: Render, Frankfurt, D-18; delayed until there is something
   to show, D-19). Spec: `docs/specs/stage-1-ci-cd-and-environments.md`.
3. Service-layer and `/api/v1` conventions (section 5.1): **built** (contracts, the
   request pipeline, errors, idempotency, rate limits, OpenAPI, the typed client and
   the first migration). Signed-in endpoints confirm the rest with sign-in (item 5).
4. Tenancy with RLS and the isolation test suite; the single app address: **built**
   (schools and groups, the request proxy, school pages, the catalog-driven isolation
   suite). Memberships and the school picker come with sign-in.
5. Auth with Better Auth: phone OTP, password and MFA; roles, custom roles and Akoso
   team roles; the permission check and its generated tests. **Part A built** (parent
   code sign-in, staff password and MFA, sessions, memberships, school picker, the
   permission check). **Part B's school side built** (custom roles, people with
   access, the security log, recovery, account deletion). Next: Akoso team sign-in with
   passkeys in the admin app (part B, pull request 2).
6. Time-zone handling, the audit log, feature flags: **built** (school-time date
   helpers and a lint rule; the hash-chained, append-only audit log with verification;
   per-school flags; platform settings, which now hold the rate limits).

Each begins with a spec in `docs/specs/`. Tenancy, auth and audit specs need the
founder's approval and a threat model before code.

**Next session:** once part B's first pull request is merged (delete its branch only if
the founder asks), build pull request 2 from the approved spec
(`docs/specs/stage-1-sign-in-part-b.md`, section 8): Akoso team sign-in with passkeys in
`apps/admin`, with the new dependency `@better-auth/passkey` 1.7.14. Ask whether to run
the cross-model review (D-24). Then prepare the Stage 1 checkpoint.

## Open questions for the founder

Full text and recommendations in `docs/decisions.md`.

- **D-OPEN-3** Node 24 or another version.
- **D-OPEN-7** Whether apps may import providers directly.
- D-OPEN-2 (AI provider), D-OPEN-4 (update section 4.0 for the brand kit) and D-OPEN-6
  (changing an assessment scheme after scores exist) are not needed yet.

## Blocked

- **Spike 04 (Paystack, R1):** the dedicated-account and split scenarios wait for the
  CAC registration and the Paystack upgrade to Registered Business.
- **Staging (CI/CD Part B):** delayed by choice (D-19); needs `akoso.ng` on Cloudflare
  and the Render account when it resumes.

Nothing blocks part B's second pull request. Part B's codes, notices and email links
use local stand-ins; live SMS waits for the Termii sender ID, and live email for the
Resend or SES account.

## Founder tasks

Unticked items in `docs/founder-checklist.md` that block the next part of Stage 1 or
have long lead times. Each is listed once.

| Task                                                                                                                                                                                          | Blocks                                              | Needed by                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| Create and own the remaining accounts the build needs (GitHub is done): hosting, Cloudflare, Sentry, PostHog, the AI provider, Resend or SES. Give agents limited keys, never your own logins | Staging deploy; observability                       | Stage 1                          |
| Open the Paystack business account (test keys are enough to start); set the category to education or software                                                                                 | The Paystack spike on dedicated accounts and splits | Stage 1 spike                    |
| Start the slow approvals now: Paystack KYC and go-live, the written confirmation of split behaviour, Termii DND sender ID, Meta Business verification and WhatsApp templates                  | Live payments, SMS and WhatsApp. They take weeks    | Stages 4 and 5; start in Stage 1 |
| Register the company (CAC), get a TIN, open a corporate bank account                                                                                                                          | Paystack live mode, legal templates                 | Stage 4                          |
| Register the domains, starting with `akoso.ng`                                                                                                                                                | Staging addresses, email sending domain             | Stage 1                          |
| Upgrade Paystack to Registered Business (after CAC) and ask it to enable dedicated accounts, subaccounts and splits                                                                           | The rest of spike 04 (R1)                           | Stage 1 spike                    |
| Roll the Paystack test secret key and webhook secret (they were pasted into a chat); turn off "pass charges to customers"; clear the old test webhook URL                                     | Safe reuse of the test keys                         | Before the next Paystack work    |

Not blocking yet: golden files and design-partner schools (before Stage 3).

## Session log

### 13/11/2026: Sign-in part B, school side (Claude)

- Spec written with a threat model; the founder approved it with all six
  recommendations. Built as pull request 1 of 2.
- Two migrations (0009 tables, 0010 checks, grants, RLS and functions). Four new tenant
  tables under forced RLS, with isolation fixtures. `security_events` gains
  `caused_by_school_id` (deliberately not `tenant_id`: the table is not a school's), read
  by schools only through `school_security_log()`, with its own isolation case.
- New `reauth_required` error; school-scoped server actions name their school in their
  input; an email interface with a local fake sender.
- Checks: `pnpm check` passes; 125 database tests (19 new) and 43 end-to-end tests (6
  new) pass locally.
- Node had been upgraded to 26 by winget; the founder reinstalled 24 and pinned it.
- Local database: two functions in migration 0010 changed after it was first applied
  locally, so they were re-applied by hand as the migration role (deleting the local
  database was refused by the permission check). A fresh database runs the migrations
  as committed.

### 12/11/2026 to 13/11/2026: Spike 04, CI/CD Part A, Stage 1 items 3 to 6 (Claude)

- **Spike 04, Paystack (R1):** signed webhooks work end to end and repeats are
  recognised; dedicated accounts and splits are refused to a Starter business, so the
  rest waits for the CAC registration and the Paystack upgrade
  (`docs/spikes/04-paystack.md`). The test keys were pasted into a chat: roll them.
- **CI/CD Part A** (pull request #10): Semgrep, CodeQL, pnpm audit, OSV, Trivy, zizmor,
  an SBOM and Renovate. Then signed commits and the code-scanning rule on `main`
  (#11, #13). Hosting is Render, Frankfurt (D-18); staging is delayed (D-19).
- **Item 3, API conventions** (#15): contracts, the request pipeline, Problem Details
  errors, idempotency keys, Postgres rate limits, OpenAPI and the typed client.
- **Item 4, tenancy** (#16, with review fixes in #17): schools and groups, the request
  proxy, the lookup cache, and the isolation suite that reads the database catalog.
  The `agy` cross-model review ran on #16 and #17 and its findings were fixed; it takes
  too long, so reviews are now skipped by default and the founder is asked each time
  (D-23, D-24).
- **Item 5, sign-in part A** (#18): parent phone codes (stored as keyed hashes), staff
  password and MFA (required for proprietor, school admin and bursar), sessions,
  memberships, the school picker and the permission check.
- **Item 6** (#19, open, CI green, review skipped, D-28): school-time date helpers and a
  lint rule against server-local dates; the hash-chained, append-only audit log with
  `verify_audit_chain`; per-school feature flags; platform settings, which now hold the
  rate limits (T16 resolved). The audit reader permission goes to proprietor and school
  admin (D-27). New tech debt T22 (no write-once copy of the audit log yet).
- Checks at the end: `pnpm check`, 105 database tests and 37 end-to-end tests pass
  locally; 13 CI checks pass on #19.

### 11/11/2026: Spike 03, report-card PDFs (Claude)

- Spec approved with new dependencies `react`/`react-dom` (worker), `qrcode` and `sharp` (D-11).
- Pinned and locked down Gotenberg 9.4.0 (A-16); made the worker runnable by bundling it
  with esbuild (A-17, closes T2).
- Rendered 600 made-up report cards: 119 s on mains power (about 223 s on battery), about
  61 KB each, CPU-bound; injected failures and a mid-batch Gotenberg restart lost no card;
  the input-hash cache served a repeat run in 6.8 s. R15 closed. Result:
  `docs/spikes/03-report-card-pdfs.md`.
- The founder judged the sample card readable in black and white.
- Opened as pull request #8; all four CI checks passed. **No cross-model review** (D-12, the
  founder's choice).
- Found: brand fonts triple a card's size (to about 207 KB); Gotenberg 9 moved merging to
  `/forms/pdf/merge`.

### 11/11/2026: Spike 02 phone session (Claude, with the founder)

- Ran the offline tests by hand on a Redmi A2+ (Android 13 Go, 2 GB, Chrome 157) over
  USB. 45 scores in 153 s, a register of 40 in 46 s; 90 unsent changes survived Chrome
  swiped away and a reboot, and all 90 reached the server exactly once.
- Chrome did not grant storage protection, and offered no install option. Recorded in
  R13 and the spike result as open questions for staging.
- Found and cleared a corrupt Next.js build cache (`apps/web/.next`).
- Pull request #6 (the spike 02 code) was merged before these phone results were pushed,
  and **without the cross-model review** (D-10, the founder's choice). The results came to
  `main` in their own pull request.

### 11/11/2026: Spike 02, offline score entry and sync (Claude)

- Recorded the skipped cross-model review on spike 01 (D-8) and deleted the two merged
  branches.
- Spec approved, with the sign-out rule D-9 (try to send, then confirm before discarding).
- Built the offline queue, sync protocol, service worker and 9 Playwright tests, plus a
  CI job. All pass locally, twice; **the CI job has not run yet**.
- Result: works in a desktop browser emulating a phone. **Still to do: the session on a
  real 2 GB Android phone** with the founder. Full write-up: `docs/spikes/02-offline-queue.md`.
- Found: Serwist reloads the page on reconnect by default (switched off, A-15); the parent
  first-load budget is already exceeded (297 KiB, plus a 986 KiB precache: R14, T13, T14);
  Drizzle returns raw timestamps as text.
- New tech debt T12: the spike switches route has no sign-in and must never be deployed.

### 11/11/2026: Spike 01, row-level security and `withTenant()` (Claude)

- Spec approved by the founder, with `pg` as the Postgres driver (D-6).
- Built PgBouncer in transaction mode, three least-privilege roles, `withTenant()` and
  40 database tests, plus a CI job for them. All pass locally; the CI job first runs on this spike's pull request.
- Result: the pattern works. R16 closed. D-OPEN-5 tested both ways; the founder chose
  option (a), published figures with no RLS bypass (D-7), which also closes R12. Full write-up: `docs/spikes/01-rls-with-tenant.md`.
- Found: a local PostgreSQL 18 service holds port 5432, so the Docker Postgres moved to 5433. Docker Desktop was started for the first time; the Compose services for
  Postgres and PgBouncer now run. Gotenberg and MinIO are still unproven.
- Committed on branch `spike/01-rls-with-tenant` and opened as pull request #5. All
  three CI checks passed, including the database tests on GitHub's Linux runners for
  the first time. The database tests are now a required check on `main`.
- **Merged by the founder without the cross-model review** that working rule 11 asks
  for on row-level security changes (D-8). No second model has reviewed `withTenant()`,
  the roles or the policies.
- Deleted the merged branches `spike/01-rls-with-tenant` and
  `docs/record-checkpoint-approval`.

### 11/11/2026: Checkpoint approved, branches tidied (Claude)

- The founder approved the section 3.2 checkpoint. Recorded here, ticked in
  `docs/founder-checklist.md`, and ADRs 0001 and 0002 moved from Proposed to Accepted.
  The PRD and architecture documents are no longer marked as drafts.
- At the founder's request, deleted the three merged working branches
  (`chore/stage-1-step-0-docs-and-scaffold`, `fix/ci-secret-scan-permissions`,
  `docs/record-github-setup`) on GitHub and locally, after confirming each was fully
  contained in `main`.
- Next session starts the Stage 1 spikes ("Next" above), each with a spec first.

### 11/11/2026: GitHub set-up (Claude)

**Done**

- Installed the GitHub CLI (`gh` 2.103.3, GitHub's official winget package). The
  founder signed it in as `ShedrackAudu`.
- Connected the repository to https://github.com/ShedrackAudu/akoso and pushed. `main`
  was created at `2a2d24e`; the founder then merged pull request #1 (the step 0 work).
- CI ran for the first time. On pull request #1 the **Secret scan** job failed: the
  workflow could not read the pull request's commits (a permissions bug, not a found
  secret). Fixed in pull request #2 by giving that one job `pull-requests: read`; the
  founder merged it.
- The founder made the repository **public**, because GitHub's free plan cannot protect
  branches on a private repository.
- `main` is protected by the ruleset `protect-main` (id 27035069): no deletion, no force
  pushes, changes only through pull requests (0 approvals, as the founder works alone),
  and both CI checks must pass on an up-to-date branch. Nobody can bypass it.

**Verified**

- GitHub reports all four rules in force on `main`.
- CI passed on `main` after both merges (`dc5c2b0` and `46a864d`), and the secret scan
  passed on pull request #2.

**Not verified**

- No direct push to `main` has actually been tried, so GitHub rejecting one is not yet
  observed.

**Notes**

- Everything in the repository is now publicly readable, including `docs/` (the brief,
  decisions, risks and founder checklist). No secret has been committed, and
  `akoso-refs/` never was.
- The merged branches `chore/stage-1-step-0-docs-and-scaffold` and
  `fix/ci-secret-scan-permissions` still exist on GitHub and locally.

### 11/11/2026: Stage 1, step 0 (Claude)

**Done**

- Planned the project with the founder; three decisions recorded (D-1 admin as a
  separate app, D-2 repository layout, D-3 brand kit with the tassel variant).
- Initialised git on branch `chore/stage-1-step-0-docs-and-scaffold`. At the founder's
  request, set the git author (name and email) for this repository only, not globally,
  and made two commits: `2a2d24e` (documents, brief split and scaffold) and `f5ef12c`
  (violet icons and SVG brand marks). Nothing is pushed: there is no remote yet.
- Fixed the pre-commit hook for Windows: it now checks staged files in batches of 40
  through `lint-staged.config.js`, because a large commit overflowed the Windows
  command-line limit.
- Copied the brief and founder checklist into `docs/` unchanged. Split the brief into
  45 files in `docs/brief/` with an index; joining them reproduces the master prompt
  byte for byte (checked by `pnpm brief:split`).
- Scaffolded the monorepo: `apps/web`, `apps/admin`, `apps/worker`, `apps/mobile`
  (README only), and packages `core`, `db`, `domain`, `schemas`, `providers`,
  `api-client`, `ui`, `typescript-config`. 22 modules, 3 pure-logic areas and 9 provider
  interfaces, each with a README and placeholder files.
- Initialised shadcn with preset `b4bg87xLw8`; every setting matches the brief
  (ADR 0002). Installed the shadcn skill and MCP server config for Claude and Gemini.
- Copied the tassel web icons from the brand kit (ADR 0004): deep purple at first,
  then replaced with the **violet** colourway at the founder's request (D-4).
- The placeholder pages show the tassel mark from SVG, one file for light and one for
  dark backgrounds (D-5: logos are SVG wherever possible).
- Wired the tooling: strict TypeScript, ESLint (type-aware, icon-library ban),
  Prettier, Vitest, dependency-cruiser boundaries, knip, husky with lint-staged, Docker
  Compose, `.env.example`, and a CI workflow with Actions pinned to commit SHAs.
- Wrote: PRD, ARCHITECTURE (including the hard-questions review),
  ARCHITECTURE-ESSENTIALS, risks, AGENTS, CLAUDE, GEMINI, decisions, glossary,
  brand-voice, permissions (skeleton), testing, velocity, tech-debt, four ADRs, README.
- The only real code: environment validation (`packages/core/src/config/env.ts`, with
  tests), brand configuration, and the `Icon` component.

**Verified on 11/11/2026**

- `pnpm check` passes: formatting, types in all 10 workspaces, lint with zero warnings,
  tests (5 passed, 27 `todo` placeholders), boundaries (no violations across 182
  modules), unused code.
- `pnpm build` passes for `apps/web` and `apps/admin`.
- The boundary rules and the icon ban were tested by adding deliberate violations
  (domain importing core and `node:fs`, one module importing another's internals and
  tables, an app importing `@akoso/db`, a `lucide-react` import). All were caught, then
  removed.
- The web app was loaded in a browser at http://localhost:3000: Figtree body text at
  16 px, Merriweather heading, the tassel icon and favicon, no console errors, and no
  `X-Powered-By` header.
- `docs/MASTER_PROMPT.md` and `docs/founder-checklist.md` are byte-identical to the
  founder's originals, and the brief split round-trips.

**Not done or not verified**

- `docker compose up` was not run: Docker Desktop was not running. The Compose file
  passes `docker compose config` only, so the three services and their health checks are
  unproven.
- The admin app was built but not opened in a browser.
- The patterns in `ARCHITECTURE-ESSENTIALS.md` are intended shapes, not yet used by code.
- The voice-guide examples and the proposed role keys and code names in the glossary
  are drafts.
- The installed shadcn skill files (`.agents/skills/`) are third-party instructions; the
  founder should look them over before relying on them.
