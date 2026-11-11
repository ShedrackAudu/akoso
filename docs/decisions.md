# Decisions

Two lists (brief section 3.3): decisions **waiting for the founder**, and decisions
**made**, by the founder or by an agent within its decision rights. Newest first within
each list. Significant design choices also get an ADR in `docs/adr/`.

## Waiting for the founder

Each has a recommendation. Work continues on other things while these are open.

### D-OPEN-1: Hosting region

- **Question:** which region hosts production and staging?
- **Why it is yours:** the brief says to choose by measured latency from Lagos, Abuja
  and Port Harcourt, and it decides the cross-border data transfer basis (section 31).
- **Recommendation:** measure during the Stage 1 spikes from real Nigerian connections
  against two or three candidate regions on the shortlisted hosts, then choose. Do not
  choose from a map.
- **Needed by:** the Stage 1 checkpoint (it is on the decision log to be signed).

### D-OPEN-2: AI provider for drafts

- **Question:** Claude or Gemini for comment and lesson-note drafts (section 2)?
- **Why it is yours:** a provider choice, and a sub-processor in the DPIA.
- **Recommendation:** decide in Stage 4, when AI comment drafts are built. The
  `AiDrafts` interface makes it swappable, and no names or identifiers are sent either way.
- **Needed by:** Stage 4.

### D-OPEN-3: Node 24 or "Node.js LTS"

- **Question:** the brief says Node.js LTS; this machine has Node 24.14 and the
  repository is pinned to it (`.nvmrc`, `engines`).
- **Recommendation:** keep Node 24 if it is the current LTS line on your hosting
  platform; otherwise tell me which version to pin. Agents must not treat their memory of
  release schedules as more current than you.
- **Needed by:** before the first staging deploy.

### D-OPEN-4: Section 4.0 wording against the brand kit

- **Question:** brief section 4.0 describes deep indigo with warm gold and a
  "threads tied into a knot" logo, and asks for a placeholder icon. Your brand kit
  (22 October) defines violet, deep purple and lavender and a finished bead-garland logo.
- **Decided so far:** you chose to use the brand kit, tassel variant (D-3 below).
- **Still open:** whether you update section 4.0 of the master prompt to match. Until
  you do, `docs/brief/04-design-and-branding.md` still carries the old wording and agents
  are told (ADR 0004) that the brand kit wins. Only you edit the brief.
- **Needed by:** not blocking.

### D-OPEN-6: Changing an assessment scheme after scores exist

- **Question:** if a school changes a component maximum (say CA1 from 10 to 15)
  mid-term after scores have been entered, is the change blocked, or allowed with every
  out-of-range score flagged for re-entry? The brief covers grading-scheme changes
  through versioning and snapshots but does not state this case.
- **Recommendation:** allow it only before the first sheet for that level is submitted;
  after that, require the head teacher to unlock, and flag every affected score. This is
  a school convention question, so it is not assumed.
- **Needed by:** Stage 3.

### D-OPEN-7: Whether apps may import `@akoso/providers` directly

- **Question:** the boundary rules forbid apps from importing `@akoso/db`. For
  providers the brief is silent.
- **Recommendation:** adapters are wired up in one place in `packages/core`, and apps
  never import providers. Not yet enforced; I will add the rule with the first real
  adapter unless you prefer otherwise. This is within agent decision rights but is listed
  because it shapes how the worker starts.
- **Needed by:** Stage 1.

## Made

### Founder decisions

| ID  | Date       | Decision                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                                                                                                                              |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-9 | 11/11/2026 | **Signing out with unsent offline changes:** an expired session never clears the phone's queue. A deliberate sign-out first tries to send everything; if anything is still unsent, it warns how many changes have not reached the school and clears them only if the teacher confirms. Reconciles brief sections 20 and 28.3                           | [Spike 02 spec](specs/stage-1-spike-02-offline-queue.md); tested in `docs/spikes/02-offline-queue.md`                                                                                              |
| D-8 | 11/11/2026 | **Spike 01 (pull request #5) was merged without the cross-model review** that working rule 11 asks for on RLS changes. The founder's choice; recorded so no later session assumes the review happened                                                                                                                                                  | Worth a Gemini review of `packages/db/src/with-tenant.ts`, `docker/postgres/init/01-roles.sql` and the policy in `packages/db/src/spike/setup.ts` before the real tenancy tables are built on them |
| D-7 | 11/11/2026 | **Platform-wide reads use published figures (option (a), was D-OPEN-5):** platform-wide screens read only figures that a tenant-scoped job has published into the `platform` schema. Nothing in the application bypasses row-level security, and no role with `BYPASSRLS` is created. Option (b), a live view owned by a `BYPASSRLS` role, is rejected | [Spike 01 result](spikes/01-rls-with-tenant.md), question 6                                                                                                                                        |
| D-6 | 11/11/2026 | **The Postgres driver is `pg` (node-postgres).** Approved with the spike 01 spec. Adds runtime dependencies `pg` and `drizzle-orm`, and development-only `drizzle-kit` and `@types/pg`                                                                                                                                                                 | [Spike 01 spec](specs/stage-1-spike-01-rls-with-tenant.md)                                                                                                                                         |
| D-5 | 11/11/2026 | **Logos always use the SVG where possible,** so they stay crisp. PNG only where a format requires it (manifest install icons, Apple touch icon, `.ico` favicon, emails or PDFs that cannot show SVG)                                                                                                                                                   | `AGENTS.md` section 10; [ADR 0004](adr/0004-brand-assets-from-brand-kit.md)                                                                                                                        |
| D-4 | 11/11/2026 | **The app icon and favicon use the violet colourway** (`app-icons/tassel/violet/web`), replacing the agent's deep-purple pick (A-10)                                                                                                                                                                                                                   | [ADR 0004](adr/0004-brand-assets-from-brand-kit.md)                                                                                                                                                |
| D-3 | 11/11/2026 | **Brand assets come from the brand kit, tassel variant.** It supersedes the indigo, gold and knot direction and the "placeholder icon" in brief section 4.0                                                                                                                                                                                            | [ADR 0004](adr/0004-brand-assets-from-brand-kit.md). Colourway: see D-4                                                                                                                            |
| D-2 | 11/11/2026 | **The repository is the `akoso` folder; `akoso-refs/` stays on disk and is gitignored.** The brief and founder checklist are copied into `docs/`; only the brand assets the app uses are copied in. The prompts changelog and the website prompt stay out                                                                                              |                                                                                                                                                                                                    |
| D-1 | 11/11/2026 | **The platform admin is a separate app, `apps/admin`,** not a route group in `apps/web`                                                                                                                                                                                                                                                                | [ADR 0003](adr/0003-admin-as-separate-app.md)                                                                                                                                                      |

### Agent decisions (within section 3.3 decision rights)

| ID   | Date       | Decision                                                                                                                                               | Why                                                                                                                                  |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| A-15 | 11/11/2026 | Serwist's reload-on-reconnect is switched off                                                                                                          | It reloads the page whenever the connection returns, throwing away a teacher's half-typed entry. Found by spike 02                   |
| A-14 | 11/11/2026 | `@swc/core` (from `@serwist/turbopack`) may not run its install script                                                                                 | The script only re-checks a native binary already installed as a platform package, and would otherwise download a fallback           |
| A-13 | 11/11/2026 | Spike 02's tables live in their own `spike_offline` schema                                                                                             | The spike 01 catalogue test requires every table in `public` to have cross-school fixtures; the spike tables still have forced RLS   |
| A-12 | 11/11/2026 | TypeScript is pinned to 5.9, not 7                                                                                                                     | The lint tooling (typescript-eslint) supports TypeScript below 6.1 only. Recorded in `docs/tech-debt.md`                             |
| A-11 | 11/11/2026 | The preset template's single-key "d" dark-mode shortcut was removed from `theme-provider.tsx`                                                          | An unmodified character shortcut that cannot be turned off fails WCAG 2.1.4. The theme follows the phone's setting                   |
| A-10 | 11/11/2026 | ~~Brand icon colourway: deep purple~~ **Superseded by D-4 (violet)**                                                                                   | Kept for the record; the founder chose violet                                                                                        |
| A-9  | 11/11/2026 | One ESLint rule (explicit return types) is relaxed for shadcn-generated files only, in `packages/ui/src/components/`                                   | The brief says not to hand-edit generated files; our own components in `packages/ui/src/akoso/` keep the full rules                  |
| A-8  | 11/11/2026 | `packages/ui` separates generated shadcn components (`src/components/`) from Akoso components (`src/akoso/`)                                           | Makes "do not hand-edit generated files" checkable                                                                                   |
| A-7  | 11/11/2026 | Tables are imported per module from `@akoso/db/schema/<module>`; there is no combined schema export                                                    | Lets the boundary check enforce "a module uses only its own tables"                                                                  |
| A-6  | 11/11/2026 | A feature module is one name across three packages (`core`, `db`, `schemas`), with its UI in the apps; 22 modules, listed in `packages/core/README.md` | Reconciles the brief's module rule (3.1) with its package layout (33)                                                                |
| A-5  | 11/11/2026 | `domain` may import `schemas` (for branded IDs and `Kobo`); nothing else                                                                               | Types must come from one place                                                                                                       |
| A-4  | 11/11/2026 | Development-only tools: ESLint with typescript-eslint, Prettier, Vitest, dependency-cruiser (boundaries), knip (unused code), husky and lint-staged    | All named or suggested by brief section 3.1                                                                                          |
| A-3  | 11/11/2026 | No Turborepo; plain `pnpm -r` scripts                                                                                                                  | The shadcn monorepo template ships Turborepo, but the brief does not ask for it and the skeleton does not need it. Easy to add later |
| A-2  | 11/11/2026 | Workspace packages ship TypeScript source and are compiled by Next.js (`transpilePackages`); there is no per-package build step                        | Simplest thing that works. How the worker is run and built is decided when it first has code                                         |
| A-1  | 11/11/2026 | Package scope is `@akoso/*`. One tooling package exists beyond brief section 33: `@akoso/typescript-config`                                            | Shared compiler settings                                                                                                             |

### Proposed defaults awaiting a first use

None yet. School-setting defaults the brief does not give are proposed here as each
setting is built.
