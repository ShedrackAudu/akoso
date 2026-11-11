# AGENTS.md

Instructions for every AI coding agent working on Akoso, whichever tool it runs in.
This file is the **single source of truth** for stack, layout, commands, conventions and
forbidden patterns. `CLAUDE.md` and `GEMINI.md` hold only tool-specific notes and point
here. When a convention changes, update this file in the same pull request.

The full brief is `docs/MASTER_PROMPT.md`. If anything here disagrees with it, the brief
wins and the difference is a bug: report it.

## 1. Start of every session

1. Read this file.
2. Read `docs/ARCHITECTURE-ESSENTIALS.md`.
3. Read `docs/progress.md`: what was done, what is next, what is blocked.
4. Read **only** the brief sections for the current task, from `docs/brief/` (index:
   `docs/brief/README.md`). The brief is too long to hold in one session.

## 2. End of every session

Update `docs/progress.md`: what was done, what is next, open questions for the founder,
anything blocked, and the unticked founder-checklist items that block the next stage.

## 3. Where we are

Build order is brief section 32: nine stages, each ending in a checkpoint the founder
approves. **Do not start a stage, or go past a checkpoint, without the founder's
approval.** There are no calendar deadlines.

- **Part 1** (sections 1–34) is the core platform. Build only Part 1.
- **Part 2** (sections 35–44) is optional modules. Do not build any Part 2 module, or a
  placeholder screen for one, until the founder explicitly says so. Do design Part 1
  data so Part 2 can be added with additive migrations only.
- The public marketing website is not part of this repository's work.

Current position is always in `docs/progress.md`.

## 4. Working rules (brief section 3)

1. **Spec first.** Before coding a feature, write or update a one-page spec in
   `docs/specs/`: user story, data changes, permissions, edge cases, acceptance criteria.
   It must be complete enough for a contract developer to build from alone. Wait for the
   founder's approval on anything touching money, results, auth or tenancy. Such specs
   include a short STRIDE threat model (section 28.2).
2. **One vertical slice at a time:** schema → domain logic → API → UI → tests. A slice
   is done only when typecheck, lint and all tests pass.
3. **Never weaken a test to make it pass.** Golden fixtures, RLS policies, migrations
   and payment code change only with the founder's explicit approval. Never merge a
   migration or payment code without the founder's line-by-line review.
4. **Tenant safety.** Every database access goes through `withTenant(tx, tenantId)`.
   Never a plain `SET`. Never bypass RLS in application code.
5. **Money** is integer kobo. Never floating point.
6. **Pure domain logic** (results, fee allocation, payroll) lives in `packages/domain`
   with no I/O.
7. **No production access.** Never request or use production credentials. Synthetic
   data only, locally and on staging. Never use real children's data in tests.
8. **Small pull requests behind feature flags,** each explained in plain English.
9. **Keep the agent files current** (this file, `CLAUDE.md`, `GEMINI.md`).
10. **Ask, don't guess,** when a Nigerian school convention is unclear (grading,
    positions, fee rules). Never invent a convention and present it as standard.
11. **Cross-model review.** For security-, RLS-, money- and results-related changes, one
    model writes the code and the other reviews the diff before the founder approves.
    Record the review in the pull request.
12. **Measure, don't feel.** Record estimated and actual hours for every feature in
    `docs/velocity.md`.
13. **Keep the handoff log** (`docs/progress.md`), as in sections 1 and 2 above.
14. **Know what you may decide** (section 5 below).
15. **Remind the founder of their tasks; never do them** (section 6 below).

## 5. Decision rights (brief section 3.3)

| You decide, and record it in `docs/decisions.md`                               | Ask the founder first                                                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Internal code structure, naming and file layout within the agreed architecture | Anything that moves money or changes allocation rules, platform fees, refunds or receipts                          |
| Small, well-known development-only tools                                       | Any new runtime dependency                                                                                         |
| Test design, fixtures, and refactors that keep behaviour the same              | Schema changes to money, results or tenancy tables; RLS policies                                                   |
| Layout details within the design system and brand voice                        | New screens or flows not in the brief; any change to what a role can see or do                                     |
| Wording of internal documents, and error messages within the voice guide       | Any Nigerian school convention the brief does not state                                                            |
| Fixing bugs whose correct behaviour is clear from the brief                    | Anything legal, tax, privacy or security-related that the brief leaves open, including relaxing any security check |
| Performance improvements that don't change behaviour                           | Changing a provider, the stack or anything in brief section 2                                                      |

- **When the brief is silent, unclear or contradicts itself:** never fill the gap with
  an invented rule or a "typical" practice. Write the question in `docs/decisions.md`
  with your recommendation, ask, and work on something else until answered. If two
  sections disagree, the more specific wins only if it is clearly the newer intention;
  otherwise ask.
- **Settings and defaults:** every school setting has a documented default. Use the
  brief's; where it gives none, propose one in `docs/decisions.md`, and ask first if it
  touches money, results, privacy or security.
- **Facts that change** (provider fees and limits, tax rates, legal rules, dates) were
  true when the brief was written. Never treat a number from memory or the internet as
  more current than the brief without asking, and never hard-code one.
- When unsure which column applies, ask. Give your recommendation and the options in one
  short message, and carry on with other work while you wait.

## 6. Founder tasks (working rule 15)

`docs/founder-checklist.md` lists what only the founder can do: company registration,
provider accounts and approvals, contracts, legal, tax and accounting advice, school
relationships, golden files and sign-offs.

- At every checkpoint, list under the heading **"Founder tasks"** each unticked item
  that blocks the next stage or go-live, with what it blocks and the stage that needs
  it. Mention each once per checkpoint; say "none" if nothing blocks.
- When the founder says an item is done, tick it with the date.
- If you find a new task only the founder can do, add it to the right stage and say so.
- **Never do these yourself:** do not sign up for accounts, contact providers or
  schools, accept terms, or make legal, tax or pricing decisions. Build around them with
  test modes, adapters, feature flags and placeholders.

## 7. Stack

TypeScript (strict, `noUncheckedIndexedAccess`) · Next.js App Router · pnpm workspaces ·
PostgreSQL 16 with RLS · Drizzle · Zod · Better Auth · pg-boss · Gotenberg ·
S3-compatible storage · Tailwind and shadcn/ui preset `b4bg87xLw8` · Phosphor icons ·
TanStack Table · React Hook Form · Serwist and Dexie · Vitest · Playwright · k6.

Requires Node 24 and pnpm (through corepack; the version is pinned in `package.json`).

Only what the scaffold needs is installed so far. Every other item above is in the
agreed stack (brief section 2) and is added by the slice that first uses it. Anything
**not** in section 2 is a new dependency: ask first.

## 8. Folder layout

```
apps/web        app.<domain>: the PWA, school screens, /api/v1, school public pages
  app/            routes, layouts, server actions, route handlers (thin wrappers)
  features/       parent/  staff/  shared/
apps/admin      admin.<domain>: platform admin for the Akoso team
apps/worker     background jobs
apps/mobile     Expo foundation (Stage 7; README only)
packages/core/src/<module>/        index.ts (public interface), service.ts, tests, README.md
packages/core/src/config/          validated environment, brand configuration
packages/domain/src/<area>/        pure logic: results, fees, payroll
packages/db/src/schema/<module>.ts tables and RLS policies
packages/db/src/with-tenant.ts     the only way to open a tenant transaction
packages/schemas/src/<module>.ts   Zod schemas
packages/providers/src/<service>/  port.ts (interface), fake.ts, real adapters
packages/api-client                generated /api/v1 client
packages/ui/src/components/        shadcn components (generated; do not hand-edit)
packages/ui/src/akoso/             Akoso components built on top
docs/                              see section 13
scripts/                           repository scripts
```

The 22 modules and their brief sections are listed in `packages/core/README.md`. Do not
invent a new module, package or top-level folder: propose it in `docs/decisions.md`.

## 9. Commands

| Command                             | What it does                                                            |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `pnpm install`                      | Install dependencies                                                    |
| `docker compose up -d`              | Start Postgres, Gotenberg and MinIO                                     |
| `pnpm dev`                          | Web app on http://localhost:3000                                        |
| `pnpm dev:admin`                    | Platform admin on http://localhost:3001                                 |
| `pnpm typecheck`                    | TypeScript in every app and package                                     |
| `pnpm lint`                         | ESLint, zero warnings allowed                                           |
| `pnpm test`                         | Vitest                                                                  |
| `pnpm test:db`                      | Database and tenant-isolation tests; needs `docker compose up -d` first |
| `pnpm boundaries`                   | Import-boundary and circular-dependency check                           |
| `pnpm unused`                       | Unused files, exports and dependencies (knip)                           |
| `pnpm format` / `pnpm format:check` | Prettier                                                                |
| `pnpm check`                        | All of the checks above                                                 |
| `pnpm build`                        | Build every app                                                         |
| `pnpm brief:split`                  | Regenerate `docs/brief/` from `docs/MASTER_PROMPT.md`                   |

How to run each test suite: `docs/testing.md`.

## 10. Conventions

### Code quality (brief section 3.1)

- Modular monolith. Each module exposes a small public interface in `index.ts`; other
  modules use only that. Dependencies point one way: apps → core → domain, db,
  providers → schemas.
- Small, focused files and functions: split past roughly 300 lines or 50 lines unless
  there is a clear reason not to.
- One way of doing each thing: one pattern for services, API handlers, forms, jobs and
  errors (`docs/ARCHITECTURE-ESSENTIALS.md`). Follow the existing pattern before
  inventing one.
- No magic numbers or strings. Configuration, plan limits, tax tables, schemes and
  templates are data or environment variables, never scattered constants.
- Comments explain _why_, not _what_. Public functions in `packages/core` and
  `packages/domain` get a short doc comment: purpose, inputs, outputs, edge cases.
- Delete dead code. No commented-out code.
- Duplicate once, abstract on the third occurrence.
- Refactors go in their own pull requests, separate from features.
- Record shortcuts in the pull request and in `docs/tech-debt.md`.

### TypeScript

- No `any`: use `unknown` and narrow. No `@ts-ignore`; `@ts-expect-error` only with a
  comment explaining why.
- Explicit return types on exported functions.
- Branded types for IDs and money (`StudentId`, `TenantId`, `InvoiceId`, `Kobo`).
- Discriminated unions for statuses and workflow states, with exhaustive `switch`.
- Zod schemas in `packages/schemas` are the single source of truth; derive types from
  them.

### Naming

Files and folders `kebab-case`; types and components `PascalCase`; functions and
variables `camelCase`; constants `SCREAMING_SNAKE_CASE`; tables and columns
`snake_case`. Use the school's words and the exact meanings in `docs/glossary.md`. If a
word seems to mean something else, or two words seem to mean the same thing, stop and ask.

### Data

- All queries go through module services using `withTenant()`. No raw database calls
  from UI code or route handlers.
- Paginate every list endpoint. Avoid N+1 queries. Indexes led by `tenant_id`.
- Store moments as `timestamptz` in UTC and date-only values as dates. Compute every
  "today", deadline and report period in the school's time zone.
- Migrations are backward compatible: expand, migrate, contract.
- Every job and webhook handler is idempotent.

### Errors and logging

- Typed application errors (`ValidationError`, `NotFoundError`, `ForbiddenError`,
  `ConflictError`). Domain code returns results for expected failures. Never swallow an
  error.
- Structured JSON logs with tenant ID, user ID, request ID and job ID. No personal data,
  tokens, OTPs or health details in logs, ever.

### Interface

- Design system: shadcn preset `b4bg87xLw8`. Extend it; never override its tokens ad hoc.
- Add components with `pnpm dlx shadcn@latest add <name>` (run in `apps/web`) or the
  shadcn MCP tools. Search the registry before writing a custom component. Never paste
  component code from a website. Do not hand-edit files in
  `packages/ui/src/components/` unless necessary, and say why in the pull request.
- Logos and brand marks: always use the SVG where possible, so they stay crisp at
  every size and screen density. The files are in each app's `public/brand/`. With
  `next/image`, pass `unoptimized` so the SVG is served as it is. Use a PNG only where a
  format requires one (the web manifest's install icons, the Apple touch icon, the
  `.ico` favicon, and emails or PDFs that cannot show SVG).
- Icons: Phosphor only, with the `...Icon` export names, through `Icon` from
  `@akoso/ui/akoso/icon`. Server components import icons from
  `@phosphor-icons/react/ssr`. Two weights only: `regular` and `fill`. When a registry
  component imports another icon library, replace the imports.
- Mobile-first for 2 GB Android phones on 3G. Body text at least 16 px; tap targets at
  least 44 px. WCAG 2.2 AA. Status is never shown by colour or icon alone.
- Every screen has loading, empty, error and offline states.
- Dates `dd/mm/yyyy`; phone numbers `+234…`; amounts in naira with thousands separators.
- Text follows `docs/brand-voice.md`. Product names come from
  `packages/core/src/config/brand.ts`; never invent a sub-brand.
- If a shadcn CLI command fails, check `shadcn --help`, and ask before improvising.

## 11. Security (brief section 28)

- Permissions are enforced on the server for every operation through the central
  permission check, and covered by tests generated from `docs/permissions.md`.
- Every lookup by ID is tenant-scoped and permission-checked.
- Only fields in the Zod schema are accepted. Roles, tenant, prices, totals and statuses
  are never set from the client.
- Parameterised queries only. No SQL built from strings.
- No user-supplied URL is fetched by the server.
- File uploads: allow-listed types, size limits, re-encoded images, private storage.
  Every file is served through a signed URL valid for 15 minutes at most.
- Verify every webhook's signature and timestamp; store the raw event before processing.
- No card data touches Akoso's servers.
- Append-only records are never updated or deleted; corrections are new entries.
- Sensitive actions write to the audit log. For sensitive fields (health data, national
  IDs, bank details, restricted notes, custody restrictions) log only that the field
  changed, never the value.
- Never send names or identifiers to the AI provider.
- Never say "tamper-proof", "fully compliant" or "error-free".

## 12. Never do this

- Never go past a checkpoint, or start Part 2, without the founder's approval.
- Never bypass or disable RLS, or query outside `withTenant()`.
- Never use floating point for money, or edit or delete a payment.
- Never render a report card from anything but a snapshot.
- Never weaken or skip a test, a lint rule or a security check to get a green build.
- Never commit a secret, a `.env` file or a raw golden file. Never log one.
- Never use production credentials or real children's data.
- Never add a runtime dependency, change the stack or switch a provider without asking.
- Never add an icon library other than Phosphor.
- Never put business logic in a component or only in a server action.
- Never import `@akoso/db` from an app, or another module's internals or tables.
- Never hard-code a price, rate, limit, date, domain or convention the brief calls data.
- Never invent a Nigerian school convention, a screen, a role or a sub-brand.
- Never do a founder task (section 6).
- Never edit `docs/brief/` by hand, or `docs/MASTER_PROMPT.md` at all: only the founder
  changes the brief.
- Never commit to `main` directly.

## 13. Documents

| File                                                                   | Purpose                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `docs/MASTER_PROMPT.md`                                                | The brief. Source of truth. Founder-owned             |
| `docs/brief/`                                                          | The brief, one file per section, generated            |
| `docs/PRD.md`                                                          | What we are building and why                          |
| `docs/ARCHITECTURE.md`                                                 | How it is built                                       |
| `docs/ARCHITECTURE-ESSENTIALS.md`                                      | One-page quick reference                              |
| `docs/risks.md`                                                        | Unresolved risks                                      |
| `docs/progress.md`                                                     | The handoff log                                       |
| `docs/decisions.md`                                                    | Decisions made, and decisions waiting for the founder |
| `docs/founder-checklist.md`                                            | Tasks only the founder can do                         |
| `docs/velocity.md`                                                     | Estimated and actual hours                            |
| `docs/tech-debt.md`                                                    | Shortcuts taken, with a suggested fix                 |
| `docs/glossary.md`                                                     | Exact meanings of terms                               |
| `docs/brand-voice.md`                                                  | Voice guide with examples                             |
| `docs/permissions.md`                                                  | The permissions matrix; tests are generated from it   |
| `docs/testing.md`                                                      | How to run every test suite                           |
| `docs/specs/`                                                          | One spec per feature                                  |
| `docs/adr/`                                                            | Architecture decision records                         |
| `docs/runbooks/` `docs/legal-templates/` `docs/help/` `docs/security/` | As named                                              |

## 14. Definition of done (brief section 34)

A feature is done only when:

- [ ] Its spec in `docs/specs/` is approved and matches what was built.
- [ ] Typecheck, lint and all tests pass in CI, including tenant-isolation tests.
- [ ] Permissions are enforced on the server and covered by tests.
- [ ] Security checks in CI pass, the relevant OWASP and ASVS items are met and
      recorded, and a threat model exists where section 28.2 requires one.
- [ ] It works on a 2 GB Android phone on a throttled 3G connection.
- [ ] Loading, empty, error and offline states are designed.
- [ ] It meets WCAG 2.2 AA and passes the automated accessibility checks.
- [ ] Dates and times follow the time-zone rules.
- [ ] Sensitive actions write to the audit log.
- [ ] Money is in integer kobo and results come from snapshots.
- [ ] Module boundaries are respected, with no `any`, no lint or unused-code warnings,
      no circular dependencies, and the module README updated.
- [ ] Any shortcuts are recorded in `docs/tech-debt.md`.
- [ ] `ARCHITECTURE-ESSENTIALS.md`, `ARCHITECTURE.md` and `AGENTS.md` still match the code.
- [ ] `docs/progress.md` is updated, decisions are in `docs/decisions.md`, and any new
      founder task is in `docs/founder-checklist.md`.
- [ ] Help-centre text and the changelog are updated.
- [ ] User-facing text follows the Akoso voice.
- [ ] Estimated and actual hours are in `docs/velocity.md`.
- [ ] It is deployed to staging behind a feature flag and the founder has reviewed it.

Report honestly what was built, what was tested, and what still needs the founder's
decision.
