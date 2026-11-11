## 3. Working rules for AI coding agents

Follow these rules in every session.

1. **Spec first.** Before coding a feature, write or update a one-page spec in `docs/specs/` with the user story, data changes, permissions, edge cases and acceptance criteria. Make each spec self-contained enough that a contract developer could build the feature from it alone. Wait for my approval on anything touching money, results, auth or tenancy.
2. **One vertical slice at a time.** Schema → domain logic → API → UI → tests. A slice is done only when typecheck, lint and all tests pass.
3. **Never weaken a test to make it pass.** Golden fixtures, RLS policies, migrations and payment code change only with my explicit approval. Never merge a migration or payment code without my line-by-line review.
4. **Tenant safety.** Every database access goes through `withTenant(tx, tenantId)`. Never use a plain `SET`. Never bypass RLS in application code.
5. **Money** is stored as integer kobo. Never use floating point for money.
6. **Pure domain logic** (results computation, fee allocation, payroll) lives in `packages/domain` with no I/O, so it can be tested exhaustively.
7. **No production access.** Never request or use production credentials. Use only synthetic data locally and on staging.
8. **Small pull requests behind feature flags.** Explain each change in plain English in the PR description. Deploy to staging daily.
9. **Keep the agent files current** (section 3.2): `AGENTS.md` is the single source of truth for stack, folder layout, commands, conventions and forbidden patterns; `CLAUDE.md` and `GEMINI.md` point to it. Update them in the same pull request whenever a convention changes.
10. **Ask, don't guess,** when a Nigerian school convention is unclear (grading, positions, fee rules). Never invent a convention and present it as standard.
11. **Cross-model review.** For security-, RLS-, money- and results-related changes, one model writes the code and the other reviews the diff before I approve. Record the review in the PR.
12. **Measure, don't feel.** For every feature, record the estimated and actual hours in `docs/velocity.md`. I use this at the velocity checks (section 32) to decide what to defer.
13. **Keep a handoff log.** Start every session by reading `AGENTS.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/progress.md` and only the brief sections (section 3.2) for the current task. End every session by updating `docs/progress.md`: what was done, what is next, open questions for me, anything blocked, and the unticked founder-checklist items (rule 15) that block the next stage.
14. **Know what you may decide.** Follow the decision rights in section 3.3: decide routine matters yourself and record them in `docs/decisions.md`; ask me before anything listed there as mine.
15. **Remind me of my tasks; never do them.** `docs/founder-checklist.md` lists what only I can do: company registration, provider accounts and approvals (Paystack, Termii, Meta, NDPC), contracts, legal, tax and accounting advice, school relationships, golden files and sign-offs. At every checkpoint (section 32), list under the heading **"Founder tasks"** each unticked item that blocks the next stage or go-live, with what it blocks and the stage that needs it; mention each item only once per checkpoint and say "none" if nothing blocks. When I tell you an item is done, tick it with the date. If you find a new task only I can do, add it to the right stage and tell me. Never attempt these tasks yourself: do not sign up for accounts, contact providers or schools, accept terms, or make legal, tax or pricing decisions. Build around them with test modes, adapters, feature flags and placeholders (section 32.2) so the build is never blocked.

### 3.1 Code quality, maintainability and scalability

The code must be clean, easy for a new developer (or a new agent session) to understand, cheap to change, and ready to scale when Akoso grows from 10 schools to 1,000. Prefer simple, boring, well-structured code over clever code. These rules apply to every package and app, and to Part 2.

**Architecture**

- Build a **modular monolith**: one deployable web app and one worker, organised into clear feature modules (e.g. `results`, `fees`, `payments`, `messaging`, `people`, `admissions`, `payroll`). Do not split into microservices. Keep module boundaries clean enough that a module could be extracted into its own service later if load demands it.
- Each module owns its schema, domain logic, services, API handlers and UI, and exposes a small public interface (an `index.ts`). Other modules use only that interface, never another module's internals or tables directly.
- Keep dependencies pointing one way: `apps` → `packages/core` (use cases) → `packages/domain` (pure logic) and `packages/db`. Domain code never imports from the database, the framework, providers or UI. Enforce this with an import-boundary tool (e.g. dependency-cruiser or ESLint boundaries) in CI, and fail the build on circular dependencies.
- Put every external service behind an interface in `packages/providers` (payments, SMS, WhatsApp, email, PDF, AI, domains, storage), with a fake adapter for tests and local development. Swapping a provider must not touch business logic.
- Modules talk to each other through service calls or domain events written to an outbox table and handled by the worker (e.g. `payment.allocated` → send receipt). No hidden side effects inside unrelated functions.
- Configuration, plan limits, tax tables, schemes and templates are data or environment variables, never constants scattered through the code. Validate all environment variables with Zod at startup and fail fast if one is missing.

**Code style**

- Small, focused files and functions, each doing one thing. If a file grows past roughly 300 lines or a function past roughly 50, split it unless there is a clear reason not to.
- Clear, consistent names from the school's domain: use the words schools use (`scoreSheet`, `classArm`, `bursar`, `familyAccount`, `term`), and keep a glossary in `docs/glossary.md`. No abbreviations a new developer would have to guess.
- One way of doing each thing: one pattern for services, one for API handlers, one for forms, one for background jobs, one for errors. Document each in `AGENTS.md`, with a one-line summary and a tiny example in `docs/ARCHITECTURE-ESSENTIALS.md`, and follow the existing pattern before inventing a new one.
- No magic numbers or strings: name them as constants or move them to configuration.
- Comments explain *why*, not *what*. Public functions in `packages/core` and `packages/domain` get a short doc comment covering purpose, inputs, outputs and important edge cases.
- Delete dead code, unused exports and commented-out code instead of keeping it "just in case". Run an unused-code check (e.g. knip) in CI.
- Avoid premature abstraction: duplicate once, abstract on the third occurrence. Avoid premature optimisation, but never ignore the performance budgets in this document.
- Formatting with Prettier and linting with ESLint (strict, type-aware rules), run on commit with a pre-commit hook and in CI. No lint warnings are allowed to pile up.

**TypeScript**

- Strict mode with `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow it. No `@ts-ignore`; `@ts-expect-error` only with a comment explaining why.
- Explicit return types on exported functions.
- Branded types for IDs (`StudentId`, `TenantId`, `InvoiceId`) and money (`Kobo`), so they cannot be mixed up.
- Discriminated unions for statuses and workflow states (score sheets, payroll runs, domains, payments), with exhaustive `switch` checks.
- Zod schemas in `packages/schemas` are the single source of truth for input and output shapes; derive TypeScript types from them rather than writing types twice.

**Errors and logging**

- Use a small set of typed application errors (e.g. `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`) mapped to consistent API responses and friendly UI messages. Expected failures in domain code return results; unexpected failures throw.
- Never swallow an error. Catch it only where you can handle it or add context.
- Structured logs (JSON) with tenant ID, user ID, request ID and job ID on every line, and no personal data, tokens or health details. The same request ID follows a request from the browser through the API to the worker.

**Data access**

- All queries go through module repositories or services using `withTenant()`; no raw database calls from UI code or route handlers.
- Paginate every list endpoint (cursor-based for large tables). Never load a whole table into memory.
- Avoid N+1 queries; check query plans for heavy screens (broadsheets, debtor lists, dashboards) and add indexes led by `tenant_id`.
- Long or heavy work (PDFs, bulk invoices, imports, messaging, reconciliation) always runs in the worker as idempotent, retryable jobs with progress tracking, never inside a web request.

**Dates, times and time zones**

- Store every moment as `timestamptz` in UTC. Each school has a time-zone setting (default `Africa/Lagos`: WAT, UTC+1, no daylight saving). Every "today", deadline, due date, schedule, quiet-hours window, cash-up day, census date and report period is calculated in the school's time zone, never the server's.
- Store date-only values (dates of birth, term dates, due dates, holidays) as plain dates, not timestamps, so they can never shift by a day.
- Show times in the school's time zone, with dates as dd/mm/yyyy (section 4.1).
- Never trust a phone's clock or time zone for anything that matters; the server records when it received each offline operation (section 20).
- Test the boundaries: payments, registers and cash-ups just before and after midnight WAT must land on the right day, term and report.

**Ready to scale**

- Keep the web app and worker **stateless**, so more instances can be added behind a load balancer. Sessions, files, jobs and caches live in Postgres, object storage or a cache service, never on a server's local disk or memory.
- Make every job and webhook handler **idempotent**, so it is safe to retry or run twice.
- Design for growth without rewrites: `tenant_id` on every row (so large tables can be partitioned later), read-heavy reports that could move to a read replica, cacheable reference data (schemes, subjects, plans) behind a cache interface, and rate limits per tenant.
- Version the app API (`/api/v1`, section 5.1) and never make breaking changes to a published version; add `/api/v2` instead, so older installs of the mobile apps keep working. This is Akoso's own versioned app API for its web and mobile clients, not an open API for third parties; read-only API keys for schools are deferred (section 23).
- Database migrations are backward compatible (expand, migrate data, then contract), so new code can be deployed without downtime and rolled back safely.
- Feature flags control new behaviour, so features can be released to a few schools first.
- Record performance budgets and watch them: report-card generation time, invoice-run time, webhook processing time, page load time on 3G. When one is exceeded, investigate before adding features.

**Keeping it maintainable**

- Every module has a short `README.md`: what it does, its main entities, its public interface, its jobs and events, and links to its specs.
- Record significant design choices as ADRs in `docs/adr/`.
- Keep dependencies few, well maintained and up to date (automated update PRs, e.g. Renovate). Ask me before adding a new runtime dependency, and prefer the platform or an existing dependency.
- Leave code cleaner than you found it, but keep refactors in their own pull requests, separate from feature changes, with tests passing before and after.
- When you finish a slice, list any shortcuts or technical debt you took in the PR and in `docs/tech-debt.md`, with a suggested fix.

### 3.2 Before any code: project documents and scaffold

Do this once, at the very start of Stage 1, before writing any feature code. Each document must be short enough to stay accurate; this master prompt remains the full brief.

1. **`docs/PRD.md`: what we are building and why.** Derive it from this prompt: the problem, users and roles, the two core differentiators, the feature list grouped by Part 1 and Part 2, key acceptance criteria, what is out of scope, and open questions. Product language only, no technical detail.
2. **`docs/ARCHITECTURE.md`: how it is built.** The tech stack and why; the monorepo layout; module boundaries and dependency rules (section 3.1); the data model overview and tenancy (RLS, `withTenant()`); key flows as simple diagrams (score entry → approval → snapshot → report card; transfer → webhook → allocation → receipt; offline sync); integrations and their adapters; background jobs; environments and deployment; security architecture (section 28). Link to ADRs for each significant decision.
3. **`docs/ARCHITECTURE-ESSENTIALS.md`: the one-page quick reference.** The most important file for day-to-day work. At most about 150 lines: stack, folder map, the non-negotiable rules (tenant safety, kobo, snapshots, server-side checks, no business logic in UI), naming conventions, the standard patterns with one tiny example each, and the commands to run. Agents read this at the start of every session instead of loading the whole architecture document.
4. **Stress-test the documents with hard questions** before going further. Ask, and answer in writing: What will break first at 50 schools? At 500? What happens when Paystack, Termii or WhatsApp is down? When two teachers edit the same score offline? When a webhook arrives twice, late or out of order? When a parent pays the wrong amount into the wrong account? When a school changes its grading scheme mid-term? When the database or a worker crashes mid-job? What could let one school see another's data? Update the PRD and architecture documents with the answers, and list unresolved risks in `docs/risks.md` for me.
5. **`AGENTS.md` (repo root): how agents must work.** Tool-agnostic instructions for any coding agent: read `ARCHITECTURE-ESSENTIALS.md` first; the working rules in section 3; the code-quality and security rules (sections 3.1 and 28); how to run, test and lint; the definition of done; what never to do; the session routine (section 3, rule 13); and the decision rights (section 3.3). **`CLAUDE.md` and `GEMINI.md` (repo root)** contain only tool-specific notes (e.g. MCP servers, skills) and a pointer to `AGENTS.md`, so the rules are never duplicated or out of sync.
6. **Scaffold the whole project structure** before coding features: create every app, package and module folder from section 33 and section 3.1, with near-empty files (e.g. each module's `index.ts`, `README.md` stating its purpose, and placeholder schema, service and test files with a one-line comment of what will go there). Wire up the tooling (TypeScript, lint, format, test runner, import-boundary rules, CI) so the empty skeleton already builds and passes CI. Features are then filled into a structure that already exists, rather than agents inventing folders as they go.
7. **Split this brief into section files.** Copy each section of this master prompt, unchanged, into its own file under `docs/brief/` (e.g. `docs/brief/11-results-engine.md`, `docs/brief/14-payments.md`), with an index in `docs/brief/README.md`. This document is too long for an agent to hold reliably in one session, so each session loads only the sections it needs (section 3, rule 13). When I change this master prompt, update the matching brief files in the same pull request; if they ever disagree, this master prompt wins and the difference is a bug.
8. **Create `docs/progress.md`** (the handoff log, section 3, rule 13) and **`docs/decisions.md`** (decisions you made under section 3.3, and decisions waiting for me). Also create **`docs/founder-checklist.md`** by copying `FOUNDER_CHECKLIST.md`, which I give you with this brief, unchanged (rule 15).

**Checkpoint:** I review and approve the PRD, the two architecture documents, the risks list, the brief split, `AGENTS.md` and the scaffold before any feature code is written. Keep all of these documents updated as the project changes; an out-of-date architecture document is a bug.

### 3.3 Decision rights

| You decide, and record it in `docs/decisions.md` | Ask me first |
| --- | --- |
| Internal code structure, naming and file layout within the agreed architecture | Anything that moves money or changes allocation rules, platform fees, refunds or receipts |
| Small, well-known development-only tools | Any new runtime dependency (section 3.1) |
| Test design, fixtures, and refactors that keep behaviour the same | Schema changes to money, results or tenancy tables; RLS policies |
| Layout details within the design system and brand voice | New screens or flows not in the brief; any change to what a role can see or do |
| Wording of internal documents, and error messages within the voice guide | Any Nigerian school convention the brief does not state (grading, positions, fee rules) |
| Fixing bugs whose correct behaviour is clear from the brief | Anything legal, tax, privacy or security-related that the brief leaves open, including relaxing any security check |
| Performance improvements that don't change behaviour | Changing a provider, the stack or anything in section 2 |

**When the brief is silent, unclear or contradicts itself:** never fill the gap with an invented rule or a "typical" practice. Stop, write the question in `docs/decisions.md` with your recommendation, ask me, and work on something else until I answer. If two sections disagree, the more specific section wins only if it is clearly the newer intention; otherwise ask.

**Settings and defaults:** every school setting has a documented default. Where the brief gives one, use it; where it doesn't, propose one in `docs/decisions.md`, and ask me first if it touches money, results, privacy or security.

**Facts that change:** provider fees, limits and behaviour, tax rates, legal rules and dates in this brief were true when written. Never treat a number from memory or the internet as more current than the brief without asking me, and never hard-code one: they are data or settings.

When unsure which column applies, ask. When you ask, give your recommendation and the options in one short message, and carry on with other work while you wait.

