# Progress: the handoff log

Read this at the start of every session and update it at the end (working rule 13).
Newest session first.

## Where we are

**Stage 1 (Foundations): step 0 approved; the rest of Stage 1 has not started.**

The founder approved the section 3.2 checkpoint on 11/11/2026: the PRD, the two
architecture documents, the risks list, the brief split, `AGENTS.md` and the scaffold.
Feature work may now begin, one spec at a time, in the order below.

## Next

In this order (brief section 32, Stage 1):

1. Architecture spikes, each with a short written result: RLS and `withTenant()` with the
   real connection pooler (**done**: R16 closed, D-7 decided); offline queue on a real 2 GB
   Android phone (R13; **done**, on a Redmi A2+; storage protection not granted); Gotenberg with a realistic report-card template (R15); Paystack
   dedicated accounts and split payments in test mode (R1).
2. CI/CD and environments: the remaining security scans (T3), staging deploy.
3. Service-layer and `/api/v1` conventions (section 5.1): confirm the patterns in
   `ARCHITECTURE-ESSENTIALS.md` with the first real use case.
4. Tenancy with RLS and the isolation test suite; the single app address.
5. Auth with Better Auth: phone OTP, password and MFA; roles, custom roles and Akoso
   team roles; the permission check and its generated tests.
6. Time-zone handling, the audit log, feature flags.

Each begins with a spec in `docs/specs/`. Tenancy, auth and audit specs need the
founder's approval and a threat model before code.

## Open questions for the founder

Full text and recommendations in `docs/decisions.md`.

- **D-OPEN-1** Hosting region (needed for the Stage 1 checkpoint decision log).
- **D-OPEN-3** Node 24 or another version.
- **D-OPEN-7** Whether apps may import providers directly.
- D-OPEN-2 (AI provider), D-OPEN-4 (update section 4.0 for the brand kit) and D-OPEN-6
  (changing an assessment scheme after scores exist) are not needed yet.

## Blocked

Nothing is blocked for step 0. See "Founder tasks" for what the rest of Stage 1 needs.

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

Not blocking yet: golden files and design-partner schools (before Stage 3).

## Session log

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
