# Progress: the handoff log

Read this at the start of every session and update it at the end (working rule 13).
Newest session first.

## Where we are

**Stage 1 (Foundations), step 0: complete and waiting at the section 3.2 checkpoint.**

No feature code may be written until the founder approves: the PRD, the two architecture
documents, the risks list, the brief split, `AGENTS.md` and the scaffold.

## Next, after the checkpoint is approved

In this order (brief section 32, Stage 1):

1. Architecture spikes, each with a short written result: RLS and `withTenant()` with the
   real connection pooler (settles D-OPEN-5 and risk R16); offline queue on a real 2 GB
   Android phone (R13); Gotenberg with a realistic report-card template (R15); Paystack
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
- **D-OPEN-5** How platform-wide screens read across schools under forced RLS.
- **D-OPEN-7** Whether apps may import providers directly.
- D-OPEN-2 (AI provider), D-OPEN-4 (update section 4.0 for the brand kit) and D-OPEN-6
  (changing an assessment scheme after scores exist) are not needed yet.

## Blocked

Nothing is blocked for step 0. See "Founder tasks" for what the rest of Stage 1 needs.

## Founder tasks

Unticked items in `docs/founder-checklist.md` that block the next part of Stage 1 or
have long lead times. Each is listed once.

| Task                                                                                                                                                                         | Blocks                                               | Needed by                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| Approve the project documents, brief split, risks list, `AGENTS.md` and scaffold                                                                                             | All feature code                                     | Now                              |
| Create the GitHub repository (part of "create accounts the build needs") and give agents limited access. Set your git name and email on this machine                         | CI has never run; nothing can be committed or pushed | Stage 1                          |
| Create and own the accounts the build needs: hosting, Cloudflare, Sentry, PostHog, the AI provider, Resend or SES. Give agents limited keys, never your own logins           | Staging deploy; observability                        | Stage 1                          |
| Open the Paystack business account (test keys are enough to start); set the category to education or software                                                                | The Paystack spike on dedicated accounts and splits  | Stage 1 spike                    |
| Start the slow approvals now: Paystack KYC and go-live, the written confirmation of split behaviour, Termii DND sender ID, Meta Business verification and WhatsApp templates | Live payments, SMS and WhatsApp. They take weeks     | Stages 4 and 5; start in Stage 1 |
| Register the company (CAC), get a TIN, open a corporate bank account                                                                                                         | Paystack live mode, legal templates                  | Stage 4                          |
| Register the domains, starting with `akoso.ng`                                                                                                                               | Staging addresses, email sending domain              | Stage 1                          |

Not blocking yet: golden files and design-partner schools (before Stage 3).

## Session log

### 11/11/2026: Stage 1, step 0 (Claude)

**Done**

- Planned the project with the founder; three decisions recorded (D-1 admin as a
  separate app, D-2 repository layout, D-3 brand kit with the tassel variant).
- Initialised git on branch `chore/stage-1-step-0-docs-and-scaffold`. **Nothing is
  committed**: the founder has not asked for a commit, and git has no name or email
  configured on this machine.
- Copied the brief and founder checklist into `docs/` unchanged. Split the brief into
  45 files in `docs/brief/` with an index; joining them reproduces the master prompt
  byte for byte (checked by `pnpm brief:split`).
- Scaffolded the monorepo: `apps/web`, `apps/admin`, `apps/worker`, `apps/mobile`
  (README only), and packages `core`, `db`, `domain`, `schemas`, `providers`,
  `api-client`, `ui`, `typescript-config`. 22 modules, 3 pure-logic areas and 9 provider
  interfaces, each with a README and placeholder files.
- Initialised shadcn with preset `b4bg87xLw8`; every setting matches the brief
  (ADR 0002). Installed the shadcn skill and MCP server config for Claude and Gemini.
- Copied the tassel, deep-purple web icons from the brand kit (ADR 0004).
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

- CI has never run (no GitHub repository).
- `docker compose up` was not run: Docker Desktop was not running. The Compose file
  passes `docker compose config` only, so the three services and their health checks are
  unproven.
- The admin app was built but not opened in a browser.
- Nothing was committed.
- The patterns in `ARCHITECTURE-ESSENTIALS.md` are intended shapes, not yet used by code.
- The voice-guide examples and the proposed role keys and code names in the glossary
  are drafts.
- The installed shadcn skill files (`.agents/skills/`) are third-party instructions; the
  founder should look them over before relying on them.
