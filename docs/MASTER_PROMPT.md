# Master Build Prompt: Akoso, School Management SaaS (Nigeria)

Paste this whole document into Claude Code or Gemini as the project brief, and save it in the repo as `docs/MASTER_PROMPT.md`.

---

Act as a senior full-stack software engineer, SaaS architect, database designer, payments engineer, security engineer and UI/UX designer with deep knowledge of Nigerian private schools.

Your task is to design and build **Akoso**, a production-grade, multi-tenant school management SaaS for Nigerian private nursery, primary and secondary schools (Nursery, Primary, JSS, SSS).

Do not build the public marketing website (it has its own separate prompt for later), a landing page or a non-functional UI prototype. Build a working application with a real backend, database, authentication, results engine, fee reconciliation, messaging, offline support, reporting and administration.

I am a solo founder-developer working with AI coding agents. Make the code understandable, well organised, strongly typed, documented and easy to run locally. Build in the order given in section 32, one slice at a time, and stop for my review at each checkpoint.

### How this document is organised

- **Part 1: Core platform (sections 1–34).** Everything needed to launch. Build only Part 1 until I tell you the core is complete.
- **Part 2: Optional modules (sections 35–44).** Add-on modules (timetable, CBT, store, transport, hostel, library, visitor log, student accounts) that I will start only after the core product is fully built and live. Do not build any Part 2 module, or its screens, until I explicitly instruct you. Do design the Part 1 data model so these modules can be added later with additive migrations only.

The working rules and code-quality rules (sections 3 and 3.1), security (section 28), privacy (section 29), testing (section 30) and definition of done (section 34) apply to both parts.

There are no calendar deadlines in this brief. Build in the order of section 32 and stop at each checkpoint; we move to the next stage when I approve the checkpoint, not on a date.

### Key terms

Use these words with exactly these meanings, in code, documents and conversation. If you meet a word that seems to mean something else, or two words that seem to mean the same thing, stop and ask (section 3.3).

| Term | Meaning |
| --- | --- |
| **School** (in code: **tenant**) | One school using Akoso. Every school's data is separated by `tenant_id` and RLS (section 7). |
| **Group** | An owner's set of schools (branches) above individual schools (section 7). |
| **Session** | A school year, e.g. 2027/28, made up of three **terms**. (A login session is always called a "login session".) |
| **Class, arm** | A class is a year group (e.g. JSS 2); an arm is one stream of it (e.g. JSS 2A). |
| **Family** | Siblings and the guardians who can see them in the app. Decides **who sees what**. |
| **Billing account** | Whoever pays a bill: a guardian or a sponsor organisation. Decides **who is invoiced and receives receipts** (section 9). A family has one billing account by default; split payers and sponsors have their own. |
| **Dedicated account** (Paystack: DVA; Monnify: reserved account) | The collection-only bank account number created for one billing account (section 14). "Family account" in this brief means the same thing. In text shown to parents, always call it the **"fees account"**. |
| **Platform fee** | Akoso's own fee from a school for a term (section 25). |
| **Portal fee** | The platform fee when a school passes it to parents as a line on their invoices (section 25). |
| **Deduction** | Akoso's share (default 10%) taken from each parent payment until the term's platform fee is covered (section 25.1). |
| **Backstop** | The direct debit from the school's own bank account that collects any shortfall (section 25.1). |
| **Payout** | Paystack's daily payment of collected fees to the school's bank account (section 14). |
| **Score sheet, snapshot** | A score sheet is one subject's scores for one arm and term; a snapshot is the frozen, approved result that report cards are printed from (section 11). |
| **Golden files** | Real past broadsheets and report cards from pilot schools, anonymised, that the results engine must reproduce exactly (sections 11 and 30). |
| **Kobo** | All money is stored in integer kobo (₦1 = 100 kobo). |
| **Akoso team** | Akoso's own staff, with the roles in section 26.2. Never confuse them with school staff. |
| **Support session** | Akoso staff viewing a school's account with its permission (section 26). |
| **Brief** | This master prompt, split into section files under `docs/brief/` (section 3.2). |

---

# Part 1: Core platform

## 1. Product vision

Akoso is the operating system for modern Nigerian schools: it gathers fees, results, attendance, staff and parents into one system, so proprietors, administrators, bursars, teachers and parents can run a school from any Android phone, even with a weak connection.

The market is private schools from Nursery to Senior Secondary, in Nigeria first and West Africa later. Build only for Nigeria now (other countries are out of scope, section 24), but do not hard-code anything that would block expansion later: keep currency, phone formats, calendars, curricula, tax rules and payment providers behind configuration or adapters, as this prompt already requires.

It wins on two jobs that schools lose sleep over:

1. **Fees that reconcile themselves.** Every family gets a dedicated bank account number. Every transfer into it is matched to the right child and invoice automatically, with an instant receipt.
2. **Correct Nigerian report cards in minutes.** Teachers enter scores on a phone, online or offline. The system computes totals, grades and positions exactly, and produces print-ready report cards in bulk.

Competitors (Edves, SchoolTry, SAFSMS and others) already ship broad module lists. We will not beat them on breadth. We win on reconciled fees, correct report cards, a phone-first offline experience and fast onboarding. Every other module only needs to be "good enough": reliable, simple and correct.

Users must be able to:

- Set up a school in under 45 minutes using Nigerian presets.
- Import students, guardians, staff, opening balances and past scores from Excel or another school system.
- Enter continuous assessment and exam scores, and publish report cards.
- Invoice fees, collect payments by bank transfer or card, and track debtors.
- Message parents by in-app notice, WhatsApp, SMS and email.
- Run daily operations: attendance, homework, lesson notes, behaviour, health and pickup safety.
- Manage admissions, payroll, expenses and multiple branches.
- Roll over to a new session with promotion, repeats and graduation.
- Get help inside the app without phoning us.
- Export all their data at any time.

The product must never publish results, receipts or balances that it cannot trace back to stored records.

**Highest-risk areas** (get extra tests, extra review and my sign-off): fee auto-matching (one wrong allocation destroys a bursar's trust), offline score entry with conflict resolution, third-term cumulative results and promotion (exercised only once a year, in July), payroll (statutory exposure), and automatic platform-fee collection (section 25.1). CBT (Part 2) joins this list when it is built, because of exam-day load and integrity.

## 2. Technology stack

Use this stack unless a compelling technical limitation requires an alternative. If you change anything, write an Architecture Decision Record (ADR) in `docs/adr/` explaining why.

**Language and framework**

- TypeScript in strict mode, end to end
- Next.js (App Router) for web app and API: server components, server actions and typed route handlers, plus a versioned REST API at /api/v1 (section 5.1)
- pnpm workspaces monorepo (web app, worker and an Expo mobile foundation, section 5)

**Frontend**

- Tailwind CSS and shadcn/ui, initialised from preset b4bg87xLw8 with the shadcn skill and MCP server (section 4.2)
- Phosphor Icons (`@phosphor-icons/react`) as the only icon library, as set by the preset
- TanStack Table for score sheets, broadsheets and lists
- React Hook Form with Zod validation
- Installable Progressive Web App (PWA) using Serwist, with Dexie (IndexedDB) for offline data
- A lightweight chart library (e.g. Recharts) for dashboards

**Backend and data**

- PostgreSQL 16+ with row-level security (RLS)
- Drizzle ORM and Drizzle migrations
- Zod schemas in a shared package, used by browser, server and worker
- Better Auth: phone OTP for parents; email and password with MFA for staff
- pg-boss job queue (runs on Postgres)
- A separate worker process from the same codebase
- Gotenberg container for HTML-to-PDF rendering
- S3-compatible object storage (Cloudflare R2) with signed URLs

**Integrations**

- Paystack: dedicated virtual accounts, subaccounts, split payments, checkout, Direct Debit, webhooks (primary)
- Monnify: reserved accounts (backup provider, same interface)
- Termii: SMS on the DND/transactional route (Africa's Talking as backup)
- Meta WhatsApp Cloud API: approved utility templates, on a Nigeria-registered WhatsApp Business Account
- Resend or Amazon SES for email
- Web Push (VAPID) for PWA notifications
- An LLM API (Claude or Gemini) for comment and lesson-note drafts only

**Development environment**

- Node.js LTS, pnpm, Docker Compose running Postgres, Gotenberg and MinIO (local S3)
- A seed script that creates a demo school with realistic, clearly fake data
- `.env.example` documenting every variable

**Production**

- Containers on a managed platform (Fly.io, Render or AWS) plus managed Postgres with point-in-time recovery
- Cloudflare for DNS, CDN, WAF and wildcard TLS
- Separate dev, staging and production environments
- Sentry, uptime checks, structured logs, product analytics (e.g. PostHog), a public status page
- Secrets in the hosting provider's secret store, never in code

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

## 4. Design and branding

### 4.0 The Akoso brand

**Name:** Akoso, from the Yoruba word *àkóso* (pronounced ah-KOH-so), meaning administration, coordination and management. Its roots are *kó* (to gather) and *so* (to tie): "gathering and tying together". Write it "Akoso" in the product and running text: capital A, never all caps. The tonal spelling *àkóso* is used only where the name's meaning is explained (e.g. the About page).

**Brand story:** a school runs on loose threads: fees, results, attendance, staff and parents. Akoso gathers those threads and ties them into one system, so the school runs as one.

**Positioning and promise:** Akoso is the operating system for modern Nigerian schools, bringing fees, results, attendance, staff and parents together in one place. The promise is **order and visibility across the whole school, every day**. In practice: a bursar can see who has paid; a head teacher sees results that are correct; a proprietor knows the state of the school at a glance; a parent sees their child's school life on their phone. Every screen should serve one of these.

**Brand lines** (store as editable configuration, not hard-coded):

- Lead line and logo lockup: "Akoso — Your whole school, brought together."
- Login, onboarding and the sales demo tenant: "Your whole school, brought together." with "Run the school. Akoso handles the rest." as an alternate.
- Proprietor dashboard empty states and onboarding: "Know your school, every day."
- Parent app welcome and install screens: "Your child's school life, in your hand."

**Voice and tone** for every UI string, empty state, error, notification and message template:

- Calm, confident and precise, like a trusted bursar or head teacher. It reassures rather than hypes. No exclamation marks and no emojis in system messages. State numbers plainly ("₦45,000 received. Balance: ₦15,000.").
- Warm to parents, and about their child by name: "Chidi's term 2 report card is ready", not "Result published"; "We received ₦45,000 for Chidi and Ada", not "Payment successful".
- Respectful to proprietors: speak about *their* school, *their* standards, *their* parents. The school is the hero; Akoso stays in the background.
- Errors say what happened and what to do next, without blame ("This score is above the CA1 maximum of 10. Please check it.").
- Keep a short voice guide with do/don't examples in `docs/brand-voice.md`, and review every message template against it.

**Product family:** every module carries the Akoso name. Use exactly these names in navigation, plan descriptions (section 25), help-centre titles and the platform admin, and never invent other sub-brands:

| Module | Covers (sections) |
| --- | --- |
| Akoso Pay | Fees, invoices, payments, reconciliation, receipts, debtors (13, 14) |
| Akoso Reports | Score entry, results engine, report cards, broadsheets, transcripts (11, 12) |
| Akoso Parent | The parent experience in the Akoso app and parent communication (17, 18) |
| Akoso Admit | Admissions and enrolment (22) |
| Akoso Staff | Staff records, the teacher experience in the Akoso app, payroll, and timetables when built (9, 15, 19, Part 2) |
| Akoso Prefect | Student and staff attendance, behaviour, pickup safety (21) |
| Akoso Insight | Dashboards, reports and analytics for proprietors (23) |
| Akoso Student | Student accounts and the student experience in the Akoso app (Part 2, section 43); hidden until the module is released |

Features that fit none of these (setup, imports, expenses, messaging credits) appear under plain names such as "Setup" or "Expenses", not new sub-brands. Keep module names in one configuration file so a name (for example Akoso Parent, for which a warmer name is under consideration) can be changed in one place.

**One app: "Akoso".** Parents and staff use the same app, named simply "Akoso": the installable PWA now (section 18) and the Expo app later (section 5). It lives at one address, `app.akoso.ng` (section 7). There is no Play Store or App Store wrapper of the PWA; the first store listings will be the Expo app when it is ready. After login, the app shows the experience for the user's role: the parent experience (Akoso Parent) or the staff and teacher experience (Akoso Staff). A user with both roles, such as a teacher who is also a parent, switches between them with the role switcher, without logging out. "Akoso Parent" and "Akoso Staff" are product names used in the website, pricing and help centre, not separate apps.

- Permissions are enforced on the server for every role (section 6), so a parent can never reach staff screens or data, whatever the client shows.
- Keep each experience in its own feature folders (parent and staff) with shared building blocks, and load staff-only screens lazily, so parents' phones never download or run staff code they do not need.
- Stricter staff rules (MFA for staff roles, offline score storage, shorter idle timeouts) apply per role inside the same app.
- **Ready to split later:** structure the code so a separate parent app and staff app could be published from the same codebase (e.g. EAS build variants with their own names, icons and bundle identifiers) without a rewrite. Do not split now; I will decide later based on usage.
- Use one icon drawn from the brand's "gather and tie" idea (see logo direction below); create a placeholder and keep the final artwork as a replaceable asset.

**Brand colours and logo direction (for reference):** deep indigo, a nod to *adire* (the Yoruba indigo-dyed cloth), paired with warm gold or ochre for a premium, academic feel. The logo direction is threads tied into a knot or interlocking strands, with a subtle adire pattern as an optional background texture. These guide brand assets (logo, icons, receipts, report-card attribution, emails). They do not override the web app's design system (section 4.1) or the design guidelines I will provide for the mobile apps and the website; check contrast for accessibility wherever indigo and gold are used together.

**School first, Akoso second:** inside a school's portal, report cards and receipts, the school's name, logo and colour lead. Akoso appears only as a small, quiet attribution:

- School web address: `{slug}.akoso.ng` (e.g. `greenfield.akoso.ng`), or the school's own domain (section 7.1), for the school's public pages (admissions, document verification). Inside the app at `app.akoso.ng`, the selected school's name, logo and colour lead. Keep the base domain in configuration (`APP_BASE_DOMAIN`), not in code.
- Report card footer: "Results prepared with Akoso" (section 12).
- Receipt header line: "{School name} · Official Receipt · Powered by Akoso" (section 14).
- Emails, SMS and WhatsApp messages are signed with the school's name, not Akoso's (sender IDs and templates in section 17).

### 4.1 Interface design

Create a calm, trustworthy, professional interface that a proprietor is proud to show parents, matching the brand promise: order and visibility, with nothing hidden or confusing.

**The web app's design system comes from shadcn preset `b4bg87xLw8`.** The preset defines the colours, fonts, radius, icon library and component base: style Nova, neutral base colour, violet theme and charts, default radius, subtle menu accent, **Figtree** for body text, **Merriweather** for headings, and **Phosphor** icons. Load both fonts with `next/font` (self-hosted, only the weights you use, `display: swap`) so pages stay light on slow connections. Extend the preset; never override its tokens ad hoc. The preset applies to the web app and the Akoso PWA (parent and staff experiences) only. The native mobile apps (section 5.2) and the public website have their own visual designs, defined by guidelines I will provide later.

**Icons:** the preset uses **Phosphor Icons** (`@phosphor-icons/react`). Use only Phosphor icons in the web app and PWA; never add or mix in another icon library (Lucide, Tabler, Hugeicons or any other). Most shadcn registry components import Lucide icons by default: when you add a component, replace those imports with the Phosphor equivalent, and add a lint rule that fails the build on imports from `lucide-react`, `@tabler/icons-react` or any other icon package. Use the current `...Icon` export names (e.g. `HouseIcon`, not the older `House`). In React Server Components, import from `@phosphor-icons/react/ssr`; in client components, from `@phosphor-icons/react`. Wrap icons in a small `Icon` component in `packages/ui` with consistent sizes (e.g. 16, 20, 24 px) and one default weight (`regular`), so every screen looks the same. Import icons individually so unused icons are not bundled. Icon-only buttons always have an accessible label.

**Outline and filled icons:** every Phosphor icon comes in six weights (thin, light, regular, bold, fill, duotone), set with the `weight` prop. Use only two: **`regular`** (outline) by default, and **`fill`** (e.g. `<HouseIcon weight="fill" />`) where it makes the interface clearer. Do not use thin, light, bold or duotone. Use filled icons in these cases:

- **Active and selected states:** the current tab in the bottom navigation and sidebar, a selected filter or toggle, a starred or pinned item. Pair the filled icon (active) with the outline version of the same icon (inactive), so the change of state is obvious at a glance.
- **Status indicators:** small icons inside status badges and alerts (paid, overdue, approved, warning, error), where a solid shape reads better than thin lines, always alongside text, never colour or icon alone.
- **Small sizes:** at 16 px and below, prefer the filled weight, because thin outline strokes become hard to see on low-end phone screens.
- **Key emphasis:** sparingly, for one primary item on a screen (e.g. the "Pay now" or "Report card ready" card), not for every icon.

Rules: keep outline icons for general actions, menus, forms and lists; never mix outline and filled icons for items of equal importance in the same group; switch between outline and filled by changing the weight of the same icon, never by swapping in a different icon; and handle the choice inside the shared `Icon` component (e.g. a `filled` or `active` prop that sets `weight="fill"`), so the rule is applied the same way everywhere.

On top of the preset:

- Semantic status tokens: success (paid, approved), warning (partial, pending), destructive (overdue, error), info. Reuse preset tokens where they exist.
- Large, readable type (minimum 16 px body on mobile) and tap targets of at least 44 px.
- **Accessibility:** meet WCAG 2.2 AA across the web app and PWA: colour contrast, keyboard use on desktop, visible focus, a label on every input, names on icon-only buttons, status shown with text and never colour alone, and respect for the phone's text-size setting. Check every screen with automated tests (e.g. axe), plus a manual keyboard and screen-reader pass on key flows (section 30).
- Each school's logo and brand colour applied to its portal, report cards and receipts through a scoped `--brand` CSS variable, checked for contrast. Never edit preset tokens per school.
- Light and dark themes as provided by the preset.

Avoid clutter, heavy animations, large images on parent pages and unreadable small text.

Design mobile-first for low and mid-range Android phones (2 GB RAM, 720p screens), then scale up to tablets and desktops. Teacher and parent screens must work one-handed on a phone. Admin and bursar screens may be denser on desktop.

Build app-specific components in `packages/ui` on top of shadcn components: status badges, naira amount display (₦ with thousands separators), score-entry grid cells, offline indicator, empty states, loading skeletons and confirmation dialogs.

Formats: dates as dd/mm/yyyy, phone numbers in +234 format, currency in naira and kobo, English UI. Message templates may have Pidgin, Yoruba, Hausa and Igbo versions. The UI itself stays in English (full UI translation is out of scope, section 24); schools can override report-card labels instead (section 12).

### 4.2 shadcn/ui setup (do this in Stage 1)

1. **Initialise shadcn with the preset**, non-interactively, in the web app:

```bash
pnpm dlx shadcn@latest init --preset b4bg87xLw8 --template next
```

Use the component base library (Radix or Base UI) that the preset defines. Because this is a monorepo, follow shadcn's monorepo setup so `apps/web` and `packages/ui` each have a `components.json` with matching style, base and aliases. Then run `pnpm dlx shadcn@latest info --json` and record the output in `docs/adr/0002-design-system.md`.

2. **Install the shadcn skill** so AI agents know the project's configuration and shadcn's composition rules:

```bash
pnpm dlx skills add shadcn/ui
```

Commit the files it adds.

3. **Add the shadcn MCP server** so agents can search, view and install registry components:

```bash
pnpm dlx shadcn@latest mcp init --client claude
```

This writes `.mcp.json` for Claude Code. For Gemini CLI, add the same server (command `npx`, args `shadcn@latest mcp`) under `mcpServers` in `.gemini/settings.json`. Commit both files.

4. **Rules for agents:**
   - Add components with `shadcn add` or the MCP tools. Never paste component code from websites.
   - Search the registry and docs (`shadcn search`, `shadcn docs`) before writing a custom component.
   - Do not hand-edit generated files in `components/ui` unless necessary, and note why in the PR.
   - To change the preset later, run `shadcn apply --preset <code>` on a branch and review the visual changes.
   - After initialising, confirm that `components.json` lists Phosphor as the icon library, that `@phosphor-icons/react` is installed, and that the fonts are Figtree (body) and Merriweather (headings); if the CLI shows another icon library or font, stop and ask me.
   - CLI flags change between versions: check `shadcn --help` if a command fails, and ask me before improvising.

## 5. Native mobile app foundation (React Native + Expo)

Later, parents and teachers will get native iOS and Android apps built with React Native and Expo. For now, set up only the **foundation**, so the native app can grow without rework. The PWA (sections 18–20) remains the main parent and teacher experience at launch.

### 5.1 Make the backend ready for a second client (from Stage 1)

- Put every use case (e.g. `getFamilyBalance`, `submitScoreSheet`, `listMyClasses`) in service functions in `packages/core` that take an authenticated context (user, tenant, roles). Server actions and API route handlers are thin wrappers that call these services. Never put business logic only in a server action or a React component.
- Expose a versioned REST API at `/api/v1` for parent and teacher use cases, with Zod-validated input and output from `packages/schemas`, a consistent error format, pagination, idempotency keys on writes and rate limits.
- Generate an OpenAPI spec from the Zod schemas, and a typed client in `packages/api-client` for the mobile app.
- Authentication: Better Auth with its Expo integration, the same phone OTP and roles, and tokens kept in secure device storage. Keep the mobile sign-in flow open to more than one method, so the student sign-in (admission number and PIN, Part 2, section 43) can be added to the Expo app without rework. The client sends the selected school in a header; the server verifies membership on every request.
- Push notifications: a `devices` table for push tokens per user, and an Expo push adapter in the messaging service alongside web push.
- Keep `packages/domain`, `packages/schemas` and constants free of web-only or Node-only imports so they also run in React Native.

### 5.2 Scaffold `apps/mobile` (Stage 7)

- Expo (latest SDK), TypeScript strict and Expo Router, inside the pnpm monorepo, with Metro configured for workspace packages.
- **Design:** the native apps have their own visual design, separate from the web app. Do not use the shadcn preset, its tokens or shadcn-style React Native component kits. I will provide the mobile design style and guidelines (colours, typography, components, iconography and motion) before the apps grow beyond the foundation. Until then:
  - Build the foundation screens with neutral placeholder styling.
  - Keep every design value (colours, fonts, spacing, radius) in one theme module inside `apps/mobile`, so the guidelines can be applied in one place.
  - Choose the styling approach (e.g. NativeWind or React Native StyleSheet with a theme) in an ADR, and keep it neutral enough to fit any design I provide.
  - Still apply the Akoso brand rules from section 4.0 (app names, icons as replaceable assets, voice, school first) and the accessibility basics: minimum 16 px body text, 44 px tap targets, and readable contrast.
- Data fetching with TanStack Query through `packages/api-client`.
- Foundation screens only: splash, phone OTP login, school picker, role switcher, parent home (children with balance and account number, read-only), teacher home (my classes, read-only), settings and log out.
- Expo push registration wired to the `devices` table; the platform admin can send a test notification.
- EAS Build and EAS Update with development, preview and production profiles; one app with the display name "Akoso" and a placeholder bundle identifier (e.g. `ng.akoso.app`, to be confirmed) and placeholder icon, kept for every future release because this Expo app will be Akoso's first store listing (there is no earlier store wrapper of the PWA); the app configuration is written so that separate parent and staff variants could be added later (section 4.0); environment variables per profile.
- Sentry for React Native.
- CI: typecheck, lint and unit tests for `apps/mobile` on every pull request.
- `docs/mobile.md` explaining how to run the app on an Android phone or emulator with a development build, and listing what remains to build.
- Decide the offline storage approach for mobile (e.g. expo-sqlite) in an ADR, but do not build it yet.

### 5.3 Not now

Feature parity with the PWA, offline score entry on mobile, in-app payments, App Store and Play Store listings, and store submissions. I will instruct these later.

Acceptance: a test parent logs in on an Android phone using the development build, sees their children and balances from the staging API, and receives a test push notification. A test teacher sees their class list.

## 6. Authentication, users and roles

Implement real authentication with Better Auth.

Features:

- Parent login by phone number with one-time passcode (OTP) by SMS or WhatsApp (WhatsApp OTP uses an approved authentication template)
- Staff login by email (or phone) and password
- Multi-factor authentication available to all staff roles; required for proprietor, admin, bursar and all Akoso team roles (section 26.2), and enforceable by the school for any other staff role
- Email/phone verification, password reset, secure session cookies (HttpOnly, Secure, SameSite)
- Session rotation on login and on privilege change; session expiry and "log out all devices"
- Rate-limited login and OTP attempts with lockout and alerting
- CSRF protection on all state-changing requests
- Login and security event log visible to the school's proprietor
- Profile editing and account deletion workflow
- One user can belong to several schools and hold several roles (e.g. a teacher who is also a parent); a school picker appears after login
- **Changing a phone number (account recovery).** Parents often change SIM cards and lose their number. A school admin can change a guardian's login number after checking their identity (in person or by video call, recorded with the reason). The change is audit-logged, the old number and any email on file get a notice, active sessions are signed out, and changes are rate-limited. Parents can add a second verified number or email as a backup login. Staff with an email login reset it themselves.

Never store plaintext passwords or OTPs. Never log tokens or OTP codes.

Acceptance: OTP login completes within 60 seconds on a throttled 2G/3G connection.

Roles:

| Role | Scope |
| --- | --- |
| Akoso team (Owner, Support, Onboarding, Finance, Sales, Ops) | Our team only, in the separate admin area; each role sees only what its job needs (section 26.2) |
| Agent | External sales agents: their own referral portal only (section 26.4) |
| Group owner | Owns several branches; consolidated view |
| Proprietor | Full control of one school |
| School administrator | Setup, students, results publishing |
| Bursar | Fees, payments, expenses, payroll |
| Head teacher / principal | Approves results, lesson notes, behaviour |
| Vice principal | Head-teacher permissions the school chooses to delegate |
| Safeguarding lead | Restricted pastoral notes, custody restrictions, safeguarding alerts |
| School nurse / sick bay | Health records and sick-bay visits for all students |
| Accountant / auditor | Read-only finance: fees, payments, payouts, expenses and payroll reports |
| Teacher | Own classes and subjects |
| Gate / front desk staff | Pickup verification (and the visitor log once Part 2 is built) |
| Parent / guardian | Own children only |
| Student | Not in Part 1. Student accounts are a Part 2 module (section 43): JSS1–SS3, created only with guardian consent, own data only. In Part 1, keep the data model and authentication set-up ready so a student sign-in method (admission number and PIN) can be added later without rework |

Enforce permissions on the server for every operation through a central permission check. Hiding a button is not access control. Keep a permissions matrix in `docs/permissions.md` and generate tests from it.

Schools can also create **custom roles** (e.g. "Exams officer", "Admissions officer") by combining permissions from the matrix, and give one person several roles. Some permissions stay restricted to named roles and can only be added to a custom role with the proprietor's explicit approval: health records, restricted notes, custody restrictions, payroll and settlement-account changes.

## 7. Multi-tenancy

This is a critical requirement. One school must never see or change another school's data.

Implement:

- A shared PostgreSQL schema where every tenant-owned table has `tenant_id uuid NOT NULL`, first in every composite index.
- RLS **enabled and forced** on every tenant table, with both `USING` and `WITH CHECK` policies.
- Tenant context set per transaction with `set_config('app.tenant_id', $1, true)` inside `withTenant()`. Queries with no tenant set must return no rows.
- An application database role without SUPERUSER or BYPASSRLS; a separate migration role.
- **One address for the app.** The signed-in app for parents and staff (the PWA, server actions and `/api/v1`) lives at one origin, `app.{domain}` (planned `app.akoso.ng`; the base domain comes from `APP_BASE_DOMAIN`). After login the user picks a school; the selected school travels with every request and is checked against the user's memberships. One install, one service worker and one login therefore cover a parent with children in several schools, and the auth cookie lives on one host only.
- **School addresses.** Each school's subdomain (`{slug}.{domain}`, e.g. `greenfield.akoso.ng`) or custom domain (section 7.1) serves its public, school-branded pages: the admissions form, document and receipt verification, and a sign-in button that opens `app.{domain}` with the school preselected. Middleware resolves the school from the host for these pages.
- A **group** entity above schools, so one owner can run several branches. Design this from day one even if the group screens come later.
- Server-side authorisation checks in every server action and route, in addition to RLS.
- An automated test that creates two tenants and proves tenant A cannot read, insert, update or delete tenant B's rows, for every table. It runs on every pull request.

Use the same rules for files: object keys are prefixed with the tenant ID, and every download goes through an authorised, short-lived signed URL.

### 7.1 Custom domains

A school can use its own domain (e.g. `portal.greenfieldschool.com`) instead of `{slug}.{domain}`. Available on the Premium plan by default (configurable).

- **Adding a domain:** the proprietor enters a hostname in Settings → Domain. Show step-by-step DNS instructions: a CNAME from the hostname to `custom.{domain}`, plus a TXT record containing an unpredictable verification token that expires after 7 days. Support subdomains first; explain that apex domains need a DNS provider with CNAME flattening or ALIAS records.
- **Certificates:** use Cloudflare for SaaS custom hostnames through its API to verify ownership and issue and renew TLS certificates automatically. Put this behind a `DomainProvider` interface.
- **States:** pending DNS → verifying → active → failing → removed. The worker re-checks pending domains with backoff and active domains daily, and notifies the proprietor if DNS breaks or a certificate fails to renew.
- **Routing:** middleware resolves the request host against a `tenant_domains` table (cached, invalidated on change) before falling back to the subdomain. Unknown hosts get a 404, never a default school.
- **Primary domain:** while a custom domain is active, the subdomain redirects to it, and links in emails, WhatsApp, SMS, receipts and report-card QR codes use it. If the custom domain fails, the redirect stops automatically and the subdomain keeps working.
- **Security:** validate the Host header against known domains; never set auth cookies on school subdomains or custom domains (sign-in happens only at `app.{domain}`); include active custom domains in allowed origins and CSP where their public pages need it.
- Removing a domain reverts the school to its subdomain immediately. Every domain change is audit-logged, and the platform admin sees each school's domain and certificate status.

## 8. School setup and academic structure

Build an onboarding wizard that a non-technical proprietor can finish in under 45 minutes.

Steps:

1. School profile: name, slug, logo, colours, motto, address, state, LGA, phone, email, school type (nursery, primary, secondary, combined), time zone (default Africa/Lagos), principal and head-teacher signatures.
2. Session and terms: session name (e.g. 2027/2028), three terms with start, mid-term break and end dates, next-term resumption date. Never hard-code a state calendar: published Lagos dates differ between sources, other states differ, and schools on international curricula run their own term dates. Each school enters and confirms its own dates. The school calendar also records non-school days (public holidays, mid-term breaks, unplanned closures): attendance uses it to count "days school opened", and absence alerts, fee reminders and other scheduled messages are not sent on those days.
3. Levels and classes: Nursery (Pre-nursery, Nursery 1–2, Reception/KG), Primary 1–6, JSS 1–3, SSS 1–3; class arms (A, B or named, e.g. Gold, Diamond); form teacher per arm.
4. Subjects: presets for both the pre-2025 NERDC lists and the 2025 revised curriculum. Each class arm records which **curriculum version** it follows, because the new curriculum is phased in by cohort from September 2025 (starting at Primary 1, Primary 4, JSS1 and SS1). SSS tracks (Science, Humanities, Business) and trade subjects are supported. Schools can add, rename or remove subjects. For arms on the 2025 curriculum, warn (do not block) when the number of subjects falls outside the revised limits, stored as data: Primary 1–3: 9–10; Primary 4–6: 10–12; JSS: 12–14; SSS: 8–9.
5. Assessment schemes per level: named components (e.g. CA1 10, CA2 10, Assignment 10, Exam 70) that must total 100; weights configurable (40/60, 30/70, etc.). Each component also sets how many decimal places a score may have (default whole numbers; e.g. allow 0.5 for schools that give half marks).
6. Grading schemes per level: bands with letter, minimum, maximum and remark. Presets: WAEC 9-point (A1–F9) and A–F.
7. Position settings per level: class position on/off, subject position on/off (so a level can show positions, hide them, or show subject positions only), rank within arm or across all arms of a class; ranking basis: by average or by total score (many schools rank by total).
8. Traits: affective and psychomotor lists with a 1–5 scale (presets provided).
9. Nursery rubric mode: skill areas with developmental ratings (e.g. Emerging, Developing, Secure) and narrative comments, without positions.
10. Fee schedule (section 13) and bank account for settlement (section 14).
11. Staff invitations with role, classes and subjects.

All subjects, schemes and traits are stored as data, versioned, and never hard-coded.

Acceptance: a new school is configured in under 45 minutes; Primary 4 can run the new curriculum list while Primary 6 runs the old one in the same session; the assessment and grading schemes of 5 real pilot schools are configurable without code.

## 9. Students, guardians, families and staff

Implement:

- **Student record:** admission number (auto-format or manual), names, gender, date of birth, photo, class/arm, status (applicant, active, withdrawn, graduated), state of origin, LGA, religion (for CRS/IRS allocation), previous school, documents, custom fields, and an optional 16-digit Learner Identification Number (LIN) for the national DNEMIS system (linked to the NIN; validated for format and stored encrypted).
- **Guardian record:** names, phone (+234 normalised), email, address, occupation, relationship, WhatsApp opt-in, and one guardian marked as the fee payer.
- **Family:** siblings and their guardians. A guardian logs in once and sees all their children.
- **Billing accounts (who pays):** a billing account is a guardian or a sponsor organisation (an employer, NGO, church, scholarship body or government scheme). Each billing account has its own dedicated bank account, statement and receipts. By default a family has one billing account, the guardian marked as fee payer, so simple families stay simple. When fees are shared, each invoice line (or a percentage of it) is assigned to a billing account: for example, the father pays tuition and the mother pays bus and lunch, or an employer pays tuition for 12 children across 9 families on one combined invoice addressed to the company, with its TIN. A child can belong to two families (e.g. half-siblings). Build this model from Stage 2, even if sponsor screens come later, because invoices, dedicated accounts and allocations all depend on it.
- **Custody and access restrictions:** a person can be marked "do not release to" and/or "no access to records", with the reason and an optional court-order document. The gate check (section 21), the parent app, messaging and statements all enforce it. Only the proprietor, head teacher and safeguarding lead can set or see these restrictions, and every view and change is audited.
- **Medical information:** blood group, genotype, allergies, conditions, emergency contact. This is sensitive data with restricted access (section 21).
- **Authorised collectors:** people allowed to pick up a child, with photo and relationship (section 21).
- **Staff record:** names, role, phone, email, qualifications, employment date, state of residence (for PAYE), tax ID (TIN), pension fund administrator and RSA PIN, NHF number, bank details (encrypted), salary grade, assigned classes and subjects.
- **Enrolment history:** one record per student per term, so class history, results and fees stay correct after promotion.
- Search and filter by name, admission number, class, status, balance and guardian phone.
- Student and staff ID cards as a batch PDF (8 cards per A4 sheet) with photo, session validity and a QR code that only authorised staff can resolve; for students the QR opens the gate-pass and pickup verification screen (section 21).

Acceptance: one family with 3 children shares one guardian login and one dedicated account; a child whose tuition is paid by an employer and whose bus fee is paid by a parent gets correct invoices, statements and receipts for each payer; a "do not release to" person is refused at the gate check; the LIN field is validated and appears in exports.

## 10. Data import and migration

Schools arrive with messy Excel files, exports from other systems and paper records. Make import a polished feature, not a script.

Implement:

- Downloadable templates for students, guardians, staff, opening fee balances and previous-term scores.
- Upload of .xlsx or .csv with a column-mapping screen.
- Saved column mappings for exports from common Nigerian school systems (Edves, SAFSMS and others), built as real export files arrive from schools.
- Phone number normalisation, name cleanup, date parsing and class matching.
- Duplicate detection (same name and date of birth; same guardian phone → siblings).
- A dry run that shows every error by row and field before anything is saved.
- Import of only the valid rows on confirmation, as one batch.
- One-click rollback of a whole import batch within 7 days.
- An import history with who imported what and when.
- An assisted-migration mode for our team (via the platform admin, section 26): collect data, dry run, school sign-off, go live, with the school's sign-off recorded.

Previous-term scores must import correctly, because third-term cumulative results depend on them.

Acceptance: a 600-student school with 5% bad rows imports cleanly in under one day when we do it, and in under two days when the school does it alone, with every error explained. Target: one week from signed contract to first invoice run.

## 11. Results engine

This is the product's core. A wrong position on a report card destroys a school's trust. Build the computation as pure functions in `packages/domain/results` and test them against real report cards (golden files).

**Score sheets**

- One sheet per class arm, subject and term; one row per student; one column per assessment component.
- Mobile-first grid that works offline (section 20); a class of 45 can be entered on a phone in under 10 minutes.
- Inline validation against each component's maximum.
- Mark a student as **absent** or **exempt** for a component or a subject; blank cells block submission.
- Status workflow: Not started → Draft → Submitted → Approved (locked) → Published.
- Only the head teacher can unlock an approved sheet. Every change after approval is audited with reason, and triggers recomputation for the whole arm.
- Completion tracker for the head teacher: which teachers have submitted which sheets.

**Computation rules**

1. Subject total = sum of component scores, each capped at its maximum and limited to the component's allowed decimal places (section 8).
2. Grade and remark = the band in the level's grading scheme that contains the total.
3. Overall total = sum of subject totals for subjects the student takes (exempt subjects excluded).
4. Average = overall total ÷ number of subjects taken, rounded to 2 decimal places (half up).
5. Class position ranks students in the arm (or across the class, if configured) by the level's ranking basis, average or total score (section 8), highest first. Ties use standard competition ranking: "1st, 2nd, 2nd, 4th". Ranking by total is only fair when students take the same number of subjects; warn the school when they don't.
6. Subject position ranks by subject total, same tie rule.
7. Class statistics: number in class, class average, highest and lowest average; per subject: average, highest, lowest.
8. Third-term cumulative: configurable as the mean of available term averages or a weighted formula; students who joined mid-session use only the terms they attended.
9. Promotion status from configurable rules (e.g. cumulative average ≥ 50 and passes in English and Mathematics), with manual override and reason.
10. Positions are hidden wherever the level's settings turn them off (common in nursery and lower primary).

Computation must be deterministic: the same inputs always produce the same outputs.

**Approval and snapshots**

When a head teacher approves a class, write an immutable snapshot of totals, grades, positions, statistics and the scheme versions used. Published report cards always render from the snapshot. Later edits to schemes never change a published result.

**Comments, traits and attendance**

- Form teachers rate affective and psychomotor traits with tap-to-rate.
- Form-teacher and principal comments per student, with a comment bank that suggests comments by average band.
- AI comment drafts: generate draft comments for a whole class (in under 30 seconds) from scores, trend versus last term, traits and attendance. Send **no names or identifiers** to the AI provider: use a placeholder such as `{first_name}` with the right pronoun, and fill in the name in Akoso after the draft returns. Never send admission numbers, contacts or health data. Each school can switch AI drafts off. Label drafts as AI-generated until edited. A human must edit or approve every draft before publishing.
- Attendance summary per term (days present / days school opened), filled from the attendance register (section 21) or entered manually.

**Mid-term progress reports**

- Optional per level: a mid-term report showing the components entered so far (e.g. CA1 and CA2), attendance to date and a short comment, from its own approved snapshot.
- No overall positions unless the school turns them on. It never replaces or changes the end-of-term result.

**Broadsheets**

- Class broadsheet (students × subjects with totals, averages and positions) as A3 landscape PDF and Excel.
- Totals on the broadsheet must match the report cards exactly.

## 12. Report cards, transcripts and testimonials

Generate report cards from published snapshots using HTML templates rendered to PDF by the Gotenberg container in the worker. Never render PDFs in the web process.

Templates:

- **Nursery:** skill-area rubric, narrative comments, attendance, photo, no positions.
- **Primary**, **JSS** and **SSS:** subject table (components, total, grade, remark, subject position if on), summary (total, average, position "5th out of 42" if on, class average, highest, lowest), traits, comments, attendance, next-term resumption date and next-term fees, school logo, signatures and stamp.
- **Third term:** adds cumulative average and promotion status.
- **Mid-term progress report** (section 11): components entered so far, attendance and a comment.

At least two layout variants per level; schools choose and brand them. Schools can override the labels and headings on their report cards (for example, local-language headings or their own term names) without code. Use A4 portrait, readable when printed in black and white. Every template carries the small footer "Results prepared with Akoso" (section 4.0); the school's logo, name and colours lead the page.

Generation:

- Bulk per class or whole school as a background job with a progress bar.
- Output: individual PDFs, a merged PDF per class, and a zip.
- Cache PDFs by a hash of their inputs; re-download does not re-render.
- 600 report cards in under 10 minutes; each PDF under 300 KB.

Publishing:

- Publish per class or school; parents see the report card in the app and receive a notification (WhatsApp with PDF where opted in).
- Optional fee gate: withhold online access for families with a balance above a school-set threshold; the school can override per student. Never withhold the printed card automatically.

Also generate:

- **Transcripts** covering multiple sessions (e.g. JSS1–SSS3) from stored snapshots, in one click per student.
- **Testimonials** for leavers from an editable template.
- **Leaving (transfer) certificates** for students who leave mid-session, showing their last published results and attendance.
- **Result verification:** a QR code on each report card and transcript that opens a page confirming the document is genuine, without exposing other data.

## 13. Fees and invoicing

Implement:

- Fee items scoped to school, level, class, arm or individual student; mandatory or optional (bus, lunch, uniform, books, excursion, PTA levy). Each fee item also has:
  - **How often:** once, per term, per session (charged in one term or spread across terms) or ad hoc.
  - **What triggers it:** the term's invoice run, admission or acceptance (e.g. acceptance fee, development levy, starter pack), entering a level, or signing up for an event or excursion.
  - **Refundable:** e.g. caution deposits, held as money owed back to the family, tracked in a deposits report, and refunded or applied when the student leaves.
  - **Pass-through:** money the school collects for someone else (e.g. WAEC, NECO and BECE registration fees), reported separately from school income.
- Invoices go to billing accounts (section 9). A sponsor gets one combined invoice and statement for all the children it pays for.
- Discounts: sibling, staff child, scholarship, bursary; percentage or fixed; per item or per invoice. Discounts above a school-set threshold need proprietor approval.
- **Write-offs:** forgiving money already owed (e.g. a family that left owing fees, or a balance the proprietor waives). A write-off is separate from a discount (which is planned before invoicing), needs approval by two authorised people (section 28.3), shows on the family statement and in reports, and can only be undone by another approved entry. Former students who still owe stay on the debtors list until paid or written off.
- Bulk invoice run per term with a preview of totals per class before issuing; 600 invoices in under 2 minutes.
- Arrears carried forward as a separate invoice line.
- Instalment plans per billing account with due dates. Schools set the maximum number of instalments per term (e.g. three), because Paystack charges its fee on every payment: one ₦300,000 transfer costs ₦300, ten ₦30,000 transfers cost ₦3,000.
- Family statement showing every invoice, payment, discount, credit and balance.
- Next-term fees shown on report cards.

Store all money as integer kobo.

## 14. Payments and automatic reconciliation

This is the second core differentiator. Every naira must trace from the bank to the payment, the allocation and the invoice.

**Setup**

- Onboard each school as a Paystack **subaccount** linked to its own bank account. Verify that the account name matches the school's registered name before activating.
- Money always settles from the payment provider directly to the school's account. The platform never holds school funds.
- Put every provider behind a `PaymentProvider` interface. Implement Paystack first and Monnify as a backup with the same interface.
- Paystack dedicated accounts require our registered business to have completed go-live and KYC (section 32.2). Until then, build and test against Paystack test mode and the development payment adapter (section 25).
- Register Akoso's Paystack business in the education or software category, not "Financial services" or "General services", so Paystack does not require each parent's BVN before a dedicated account is issued. Create dedicated accounts only with the parent's consent, and that consent always comes through the school, never through the app: the school collects it (e.g. a line on its enrolment or fee form that parents sign) and confirms it per family in Akoso, by import or on the family record, and the consent ledger (section 29) records who confirmed it and when. Accounts are then created automatically for every confirmed family before the first invoice run.
- A dedicated account is not a bank account the parent owns: it is a collection-only account number issued through Paystack's partner bank under Akoso's business, which the parent cannot withdraw from or use for anything else; everything paid in settles to the school. The account name shown in the parent's banking app is the business name followed by the payer's name (e.g. "AKOSO / NGOZI OKAFOR"); ask Paystack to show each school's name instead (e.g. "GREENFIELD ACADEMY / NGOZI OKAFOR"), so parents can see they are paying the right school. Explain this in the parent help guide and the school's consent wording.

**Dedicated bank accounts**

- Create one dedicated account per **billing account** (section 9), linked to the school's subaccount. Most families have one billing account, so most families have one dedicated account. Allow per-student accounts as a school setting.
- Show the account number and bank on invoices, the parent app, reminders and report cards.
- Track the provider's DVA limit per environment (Paystack's default is 1,000 accounts until increased on review) and alert before it is reached. Ask Paystack for a higher limit before onboarding the second school (section 32.2).

**Payment flows**

1. A parent transfers any amount to the family's account from any bank app or USSD.
2. The provider sends a webhook. Verify the signature, store the raw event in a `payment_events` inbox (unique on provider reference), return HTTP 200 immediately.
3. The worker matches the account to its billing account (section 9) and allocates the amount only to invoice lines that billing account is responsible for: oldest unpaid invoice first; within an invoice, mandatory lines before optional lines; across siblings by the school's rule (default: oldest invoice first). A bursar can override the allocation within a family, e.g. when a parent says the money is for one particular child.
4. Issue a numbered receipt and notify the parent within 60 seconds. Receipts are headed "{School name} · Official Receipt · Powered by Akoso" and the notification names the child ("We received ₦45,000 for Chidi."), following the brand voice in section 4.0. Receipt numbers follow the rules below.
5. Overpayment becomes family credit, applied automatically to the next invoice.
6. A nightly job compares stored payments with the provider's transaction list and records anything missed.

**Receipt numbers**

- Number receipts per school in one unbroken sequence, optionally restarting each session, e.g. `GA/2027-28/000412`.
- Take numbers from a single counter per school, locked inside the same database transaction that creates the receipt, so two payments arriving together can never share a number and a failed transaction never uses one up. Do not use plain database sequences, which skip numbers on rollback.
- A cancelled receipt keeps its number and is marked "Cancelled — replaced by receipt …". Numbers are never reused or deleted, so the sequence has no holes.

**Payments into the school's own bank account (bank-statement import)**

Many parents will keep paying into the school's existing bank account (by transfer, standing order or cash at a branch), especially at first. Those payments never pass through Paystack.

- Bursars upload a statement downloaded from internet banking (CSV or Excel at first; PDF later if needed), with saved column formats per bank, reusing the import tool in section 10.
- Transactions already seen are ignored, so overlapping statements never count anything twice.
- For each money-in line, Akoso suggests a billing account from the amount (against outstanding balances), the sender's name (against guardian and sponsor names) and student names or admission numbers in the narration, with a confidence level. The bursar confirms with one tap; nothing is matched automatically below a school-set confidence.
- Confirmed lines become normal payments (source: bank statement) with receipts; the rest go to the unmatched queue. Paystack payout lines are recognised as payouts, not new payments (below).
- Receipts for these payments include a line such as "Next time, pay into your fees account: Wema 0123456789", to move parents over gradually.
- An open-banking connection that fetches statements automatically is a later option: record it in an ADR, not for launch.

**Paystack payouts to the school (settlement matching)**

Paystack pays the school once per working day for many payments, minus its fees, so the school's bank shows one line where Akoso shows many payments.

- Fetch payouts from the provider's API and link each one to the payments, fees, refunds and chargebacks it covers.
- A daily payout report shows the expected amount, the amount received and any difference. Alert on a payment not paid out after a set number of days, a payout that doesn't equal payments minus fees minus refunds, and a failed or held payout.
- Keep two views: family balances use the date the parent paid; the cashbook and bank view use the date the money reached the school's bank (section 16).

**Moving a payment to the right family**

Dedicated account numbers look alike, so some parents will pay into the wrong family's account.

- A "Move payment" action: the bursar picks the payment, the correct billing account (and optionally the child or invoice), a reason and evidence (e.g. the parent's transfer screenshot).
- It needs a second authorised person's approval above a school-set amount (section 28.3).
- Akoso reverses the original allocations (so the wrong family's invoices reopen), creates the new allocations, marks the original receipt cancelled and replaced, issues a new receipt, and sends both families a short, polite notice with their correct balance.
- Payments are never edited or deleted; the move is a linked set of new entries.

**Refunds and disputes**

- Under Paystack's terms, refunds and chargebacks on payments through Akoso are charged to Akoso's main account, not the school's. So school-fee refunds are made by the school from its own bank account and recorded in Akoso with evidence, not sent through Paystack's refund API. Use the refund API only for Akoso's own platform fee.
- A chargeback (card dispute) alerts the bursar and Akoso at once, with a place to upload evidence. Paystack accepts unanswered disputes automatically after a short window (16 hours in Nigeria at the time of writing), so respond the same day. A lost chargeback is recovered from the school under its agreement with Akoso (section 25.1).

**Provider fees**

- Record the provider's transaction fee on every payment, separately from the amount the parent paid, so fee reports and the cashbook reconcile with bank settlements.
- Credit the family with the full amount they transferred. The school bears provider fees; parents are never charged a processing fee on top of their school fees.

Also support:

- Card or transfer checkout from the parent app for any amount (part payment allowed unless the school sets a minimum). Every payment screen, invoice and reminder shows the fees account number first and card payment second.
- Manual entry of cash, POS and bank-teller payments, with an evidence photo and the collector's name.
- An **unmatched payments** queue for transfers that cannot be matched, with manual assignment and ageing.
- Refunds, reversals and credit notes as new entries with reasons. Never edit or delete a payment.
- A daily cash-up per collector, with a bursar audit trail.
- Debtor dashboard: expected, collected, outstanding and collection rate by class, updated live, with aged-debt buckets and export.
- Automated reminders: scheduled per school, sent only to families with a balance, respecting quiet hours, and stopping once paid. Reminders invite parents to clear the balance or the next instalment in one payment ("Clear your balance of ₦85,000"), not to send small top-ups.

Acceptance:

- A webhook delivered twice creates exactly one payment.
- Property-based tests prove no money is ever created or lost: every kobo is allocated, held as credit, or in the unmatched queue.
- At least 95% of transfers are matched automatically in the pilot.
- The proprietor sees expected vs collected live.
- Re-uploading the same bank statement creates no duplicates; a moved payment leaves both families' balances and receipts correct; 100 simultaneous payments get 100 receipt numbers with no gaps or duplicates.

## 15. Payroll

Build payroll for school staff using Nigerian rules under the Nigeria Tax Act 2025 (in force from 1 January 2026).

- Salary structures and grades: basic, housing, transport and other allowances; deductions; loans and advances.
- PAYE using **versioned tax tables with effective dates**, stored as data so rule changes need no code deploy. Seed the 2026 bands: 0% on the first ₦800,000 of annual taxable income, then 15% up to ₦3m, 18% up to ₦12m, 21% up to ₦25m, 23% up to ₦50m, 25% above. The old Consolidated Relief Allowance is abolished; do not apply it. Rent relief: 20% of annual rent, capped at ₦500,000, using each employee's declared annual rent (with an optional evidence upload).
- Pension: 8% employee and 10% employer, configurable, for employers with 3 or more staff.
- National Housing Fund (2.5% of basic) and NSITF (1%) as configurable per-employee settings (sources differ on whether NHF is now voluntary).
- Monthly payroll run with draft → review → approved → paid states; payslips as PDF; bank payment schedule export; PAYE, pension and NHF remittance schedules. PAYE is paid to the tax authority of each employee's state of residence (e.g. LIRS for Lagos), so PAYE schedules are grouped by state; pension schedules are grouped by each employee's pension fund administrator.
- Optional deduction of a staff member's children's school fees from salary, posted automatically as a payment to the child's billing account (section 9).
- A statutory remittance calendar with reminders to the bursar: PAYE due by the 10th of the following month; pension remitted within 7 working days of paying salaries. Store these deadlines, and the names of the tax and pension authorities, as data (federal tax administration is now the Nigeria Revenue Service, formerly FIRS).
- A parallel-run mode to compare with a school's existing payroll.

Acceptance: a parallel run against two pilot schools' payroll for the same month matches to the naira, or every difference is explained.

I will verify all tax and statutory rates with an accountant before launch. Mark the seeded values as "to be verified" in the admin screen.

## 16. Expenses and cashbook

- Expense categories, vendors, petty cash and receipt photo upload.
- Approval workflow above a school-set amount.
- Monthly income vs expense report and a simple cashbook.
- The cashbook and bank view record fee income on the date it reached the school's bank (Paystack payouts and bank-statement lines, section 14), so the monthly report matches the bank statement. Akoso's platform fee (section 25.1) appears as an expense line, "Akoso subscription".
- Export to Excel and in formats accountants can import into tools such as QuickBooks and Zoho Books.

Acceptance: the monthly income and expense report matches the cashbook.

Full double-entry accounting (general ledger, trial balance, balance sheet) is out of scope.

## 17. Communication

Build one messaging service with channel adapters and a single `notifications` outbox table.

**Channels, in cost order**

1. In-app and web push (free): default for everything.
2. WhatsApp Cloud API: approved **utility** templates for receipts, report-card PDFs, fee reminders and absence alerts. Never send marketing templates. Capture WhatsApp opt-in per guardian. Use a Nigeria-registered WhatsApp Business Account, so authentication (OTP) messages are not billed at the much higher international authentication rate. From 1 October 2026 Meta bills per delivered message, including service messages, so WhatsApp is for rich content, not the cheap default.
3. SMS via Termii: transactional messages (OTP, receipts, alerts) on the **DND route** with a registered sender ID. Promotional broadcasts on the generic route are queued outside the 8 PM–8 AM window for MTN numbers.
4. Email via Resend or SES for receipts, report cards and staff invitations.

Critical messages (receipt, results ready) fall back from WhatsApp to SMS if undelivered within 10 minutes.

**Who messages come from**

Record the decision in an ADR. The default for launch:

- **WhatsApp:** one Akoso WhatsApp Business number, with the school's name at the start of every template ("Greenfield Academy: We received ₦45,000 for Chidi…"). Per-school numbers, through Meta's embedded sign-up for technology providers, can be added later as a Premium option.
- **SMS:** one registered Akoso sender ID at first, with the school's name in the message. A school may apply for its own sender ID; each needs its own Termii approval, so it is an onboarding step with a waiting time, tracked in the onboarding checklist.
- **Email:** sent from an Akoso domain with SPF, DKIM and DMARC set up, the school's name as the display name and the school's email as reply-to.

**Features**

- Message templates with variables, in English plus optional Pidgin, Yoruba, Hausa and Igbo versions. Seed templates follow the Akoso voice (section 4.0): calm and confident, plain numbers, no exclamation marks, the child's name in parent messages, and signed with the school's name.
- Broadcasts to the whole school, a level, a class, debtors or a custom list, with a **cost preview** before sending.
- Announcements and a school events calendar visible in the parent app, with event RSVP and digital permission slips (e.g. for excursions): parents give or refuse consent in the app, the school sees who has and hasn't answered, and an optional event fee is invoiced on acceptance.
- Newsletters (rich text with images) published in the app.
- Parent–teacher meeting scheduling: teachers publish slots, parents book them, teachers see their schedule.
- Two-way messages between parents and form teachers, with school-set hours and admin visibility.
- Delivery status per message, retries with backoff, and a delivery report.
- **Message credits:** a prepaid credit ledger per school; credits are debited on delivery; low-balance alerts; usage reports. Credit prices are configurable per channel with a margin over provider cost (planning assumption: about 10–15 notifications per family per term). Never absorb messaging costs into the subscription. Login and security codes (OTPs) are the exception: by default Akoso bears their cost as a platform cost, tracked per school and kept low by the limits in section 28.4; this is a platform setting I can change.
- Quiet hours and frequency caps per guardian.

## 18. Parent app

Build an installable PWA for parents, optimised for 3G and costly data.

- Login with phone number and OTP in under 2 minutes; no password needed.
- Switch between children.
- Home: each child's balance, the fees account number to pay into (with a copy button), latest result, attendance and announcements.
- Pay any amount, transfer first: the fees account number (with a copy button) is the main way to pay, and "Pay by card" is a smaller second option, because Paystack's fee on a transfer is capped at ₦300 while a card payment can cost up to ₦2,000. Download receipts and statements.
- View and download published report cards and past results.
- Homework, attendance, events (with RSVP), newsletters and PTA bookings.
- Messages with the form teacher.
- Report an absence or lateness for a child (reason and days), which the form teacher sees on the register (section 21).
- Manage authorised collectors and one-time pickup codes (section 21).
- Consent and privacy settings, notification preferences and message language (the app itself stays in English, section 4.1).

Performance: under 200 KB transferred on first load and under 50 KB on repeat visits; usable on a 2 GB Android phone; passes the Lighthouse PWA installability checks. The PWA is installed from the browser at `app.akoso.ng`; there is no Play Store or App Store version until the Expo app is ready (section 5). The parent welcome and install screens use the line "Your child's school life, in your hand."; staff see a staff welcome after login.

**Installing on phones:** show simple, illustrated install steps. On Android: the browser's install prompt or "Add to Home screen". On iPhone: Safari → Share → "Add to Home Screen"; explain that iPhones only show notifications from a web app added to the Home Screen. Critical messages to iPhone parents who haven't installed it fall back to WhatsApp or SMS.

**Parent activation pack:** for each school, generate the printable payment-account consent slip (section 29.1) and a printable flyer (PDF) with a QR code that opens `app.akoso.ng` with the school preselected, plus ready-to-paste WhatsApp broadcast text, so schools can get parents onto the app quickly. Track activation per school (section 31).

## 19. Teacher workspace

On a phone, every daily teacher task is reachable within 2 taps from the home screen:

- My classes and subjects, with score-sheet status.
- Attendance register (section 21).
- Score entry (online and offline).
- Comments, trait ratings and AI comment drafts (form teachers).
- Homework and assignments: post with attachments (stored per tenant in R2); optional photo submissions from students. Parents see homework the same day.
- Lesson notes and schemes of work against NERDC themes, with AI drafts (labelled and editable) and head-teacher approval or return with comments.
- Messages with parents of their class.

## 20. Offline mode

Teachers must be able to work through a school day with no connection.

- A service worker caches the app shell and the teacher's current class lists and score sheets.
- Score entry, attendance and trait ratings save to IndexedDB first, as queued operations with client-generated IDs.
- An always-visible indicator shows online/offline state and the number of unsynced changes.
- On reconnect, operations sync in order; the server validates each one.
- Conflict rule: the server keeps a version number for every score cell. An offline edit records the version it started from. On sync, if the server's version has moved on, the change the server received later wins, and the overwritten value is kept and shown on a conflict review screen for the head teacher. Never use a phone's clock to decide which edit wins, and never silently lose a score.
- If the teacher's login expires while offline, keep the queued work on the phone, ask them to sign in again when back online, then sync. Queued work is never discarded because a session expired; it is cleared only after a successful sync or an explicit, confirmed discard.
- Approved (locked) sheets cannot be changed offline.

Acceptance: in airplane mode, a teacher enters 300 scores and a register, reconnects, and everything syncs with zero loss and no duplicates.

## 21. Daily operations and safeguarding

**Student attendance**

- Morning (and optional afternoon) register on mobile, offline-capable; a class of 40 in under 60 seconds.
- Statuses: present, absent, late, excused.
- Absences reported by parents (section 18) appear on the register and can be marked excused.
- Absence alert to opted-in parents by 10 AM.
- Reports by student, class and term; feeds the report-card attendance summary.

**Staff attendance**

- Clock-in by scanning a QR code displayed at the school gate, with an optional geofence check.
- Lateness and absence reports per staff member per month.
- CSV import from biometric devices (no device integration).

**Staff leave**

- Staff request leave (type, dates, reason) in the app; the head teacher or proprietor approves or declines; approved leave shows on staff attendance and on the day's cover list.
- Leave types and yearly allowances per staff grade are school settings, and leave balances show on the staff record. Linking unpaid leave to payroll can come later.

**Behaviour and health**

- Merits, demerits, incidents and sanctions, with head-teacher review.
- Restricted notes (visible only to the head teacher and the safeguarding lead) for pastoral concerns, instead of a counselling case-management module.
- Sick-bay visits: complaint, action taken, medication given, parent notified.
- Health data is sensitive: visible only to the school nurse, head teacher and safeguarding lead (and any role the proprietor explicitly allows), and every view is audited.

**Pickup safety and gate pass**

- Each child has authorised collectors with photos.
- Parents can issue a one-time pickup code or QR for someone else, valid for a single day.
- Gate staff verify a collector in under 15 seconds on a phone; every release is logged with time and staff name.
- Early-exit gate passes approved by the head teacher.
- The gate check enforces custody restrictions (section 9): a "do not release to" person is refused, and the safeguarding lead and head teacher are alerted at once.

**Session rollover, promotion and graduation**

- At session end: apply promotion rules, review exceptions (repeat, withdraw, graduate), allocate students to next session's arms, carry forward balances and credits, archive the old session. Graduated students stay in the archive (there is no alumni portal).
- Run as a guided wizard with a preview; a pilot school completes it in under 1 hour.
- Reversible within 7 days. No record or balance may be lost.

## 22. Admissions

Schools recruit for September between March and August, so admissions are built in Stage 5 (section 32) and must be ready before a school's admissions season. Build:

- A public application page per school at `{slug}.{domain}/apply` with a configurable form and document upload.
- Enquiry and application pipeline: Enquiry → Applied → Exam scheduled → Exam taken → Offer → Accepted → Enrolled, with a board view.
- Application or entrance-exam fee paid through Paystack and reconciled automatically.
- Exam scheduling, score capture and ranking.
- Offer and rejection letters from templates, sent by email/WhatsApp; an offer can carry an acceptance fee and an expiry date.
- One-click conversion of an accepted applicant to a student and family, with no re-entry.

## 23. Dashboards, reports and exports

**Proprietor dashboard** (loads in under 3 seconds on mobile): fees expected vs collected, collection rate trend, top debtors, enrolment by class, results progress this term, attendance rate, messaging spend and credit balance, and payment processing fees in context (e.g. "Collected ₦24.6m · Paystack fees ₦61,000 (0.25%)"), with the split between transfers and card payments.

**Termly business review:** a one-click PDF summary per school per term (collections, debtors, enrolment, results completion, parent activation, messaging spend, and payment processing fees as a share of collections) that we use in a termly review with each proprietor.

**Early warning (Akoso Insight):** flag students whose averages are falling term on term, who are failing core subjects, or whose attendance drops below a school-set level, to the form teacher and head teacher, with a short reason. Flags prompt a conversation; they are never shown to parents automatically or used to rank children.

**Group dashboard:** consolidated collections, enrolment and results across branches, with a branch switcher and shared fee templates.

**Standard reports:** class lists, enrolment summaries, debtor lists, payment registers, daily cash-up, attendance, broadsheets, staff lists, payroll summaries, admissions funnel. Every report exports to Excel and PDF.

**Government and exam exports:**

- Enrolment, staff and facilities data in a format ready for the Annual School Census and DNEMIS, including the Learner Identification Number. Acceptance: a pilot school's state officer accepts the export, or it is checked field by field against the ASC instrument.
- Candidate data exports for WAEC, NECO, BECE and Common Entrance registration, matching each body's published format where available.

**Data portability:** a school can export all its data (CSV/JSON plus PDFs) in under 30 minutes at any time, including after cancelling. Read-only API keys for schools are deferred.

## 24. Out of scope

The optional modules (timetable, CBT, store, transport, hostel, library and visitor log) are specified in Part 2 and are not part of the core build.

**Do not build** native app features beyond the foundation in section 5, a Play Store or App Store wrapper of the PWA, student accounts before Part 2 (section 43), GPS bus tracking, biometric device integrations, a full LMS or video classroom, double-entry accounting, school-fee lending or financing on our balance sheet, a WhatsApp AI chatbot, a school website builder, USSD channels, full UI translation into Yoruba, Hausa, Igbo or Pidgin, a cafeteria POS, an alumni portal, counselling case management, state/SUBEB government dashboards, or support for other countries and white-label versions.

What we offer instead:

| Not building | Offer instead |
| --- | --- |
| GPS bus tracking | Transport module with manifest (section 38, Part 2) |
| Biometric devices | QR/geofence clock-in plus CSV import |
| LMS / virtual classroom | Homework (section 19) and links to Google Classroom or YouTube |
| Double-entry accounting | Cashbook and accountant exports (section 16) |
| Fee lending | Instalment plans (section 13); a referral partnership later |
| WhatsApp AI chatbot | Template notifications (section 17) |
| School website builder | Admissions page (section 22) and custom domain (section 7.1) |
| USSD | Bank transfer, including bank USSD, to the family account (section 14) |
| Full UI translation | Localised message templates and report-card label overrides |
| Cafeteria POS | Lunch as an optional fee item |
| Alumni portal | Graduated students kept in the archive |
| Counselling case management | Restricted notes in the behaviour log |
| Government dashboards | DNEMIS/ASC exports (section 23) |
| App-store wrapper of the PWA | Installable PWA now; the Expo app later (section 5) |
| Student accounts | Parents see everything in Part 1; student accounts come with the Akoso Student module (Part 2, section 43) |

## 25. Subscriptions and billing (our revenue)

Design a configurable subscription system. Plan names, prices and limits are data, not code. Describe plan contents with the product-family names from section 4.0 (Akoso Pay, Akoso Reports, Akoso Parent, Akoso Admit, Akoso Staff, Akoso Prefect, Akoso Insight).

Suggested initial plans, priced per **active student per term** with a minimum per term:

| Plan | Price per active student per term | Minimum per term | Includes |
| --- | --- | --- | --- |
| Starter | ₦400 | ₦30,000 | Setup, records, results and report cards, attendance, fee invoicing and collection through family bank accounts with automatic receipts, messaging (credits extra) |
| Standard | ₦700 | ₦50,000 | Starter + parent app, debtor dashboard and reminders, WhatsApp, admissions |
| Premium | ₦1,000 | ₦100,000 | Standard + payroll, expenses, AI drafts, multi-branch, safeguarding, custom domain, and Part 2 modules once released |

These are starting values, being validated with pilot schools. **All pricing is data, adjustable from the platform admin without a code change:**

- per plan: name, price per active student, minimum per term, included modules and limits;
- per school: a negotiated price or minimum, a discount, or a longer free period, with a reason and an end date;
- platform-fee collection settings (section 25.1): the percentage (default 10%) and the backstop week (default week 6);
- messaging credit prices per channel, the full-session upfront discount, referral credit, agent commission rates and the length of the free first term.

Every change has an effective term and a history. Existing schools keep their current price until the term a change takes effect, and get notice before any increase. The website reads the same pricing data (website prompt, section 2).

Implement:

- Active-student count frozen at a school-term census date (e.g. end of week 4); the term's fee matches that count.
- Free first term for new schools, then automatic conversion or a data export.
- Discount for paying a full session upfront; referral credit (one free term per referred school).
- The school chooses whether it absorbs Akoso's fee or passes it to parents as a per-student "portal fee" line on their invoices. Either way the amount Akoso is owed is the same and it is collected the same way (section 25.1). A portal fee is money the school collects for Akoso, reported separately from school income. When the fee is passed to parents, each parent's invoice shows an "Akoso portal fee" line; once a parent's payment covers it, Akoso issues that parent a receipt and tax invoice for it (showing VAT once Akoso is VAT-registered). Any part of the school's term fee not covered by parents' portal-fee payments (e.g. families who haven't paid) remains owed by the school and is invoiced to the school.
- Messaging credits: deducted automatically like the subscription (section 25.1), or topped up by card.
- Upgrades, downgrades and cancellation; a statement of fees, deductions and credits per school.
- Grace period and read-only mode for unpaid schools. Never delete data or block parents from paying fees because a school's subscription is overdue.
- Agent and referral tracking: referral codes, agent attribution and monthly commission statements generated automatically (default commission 15–20%, configurable per agent).

Verify every payment webhook signature, use idempotency keys, and never trust a frontend success message. Never store card details. Without live credentials, use a clearly labelled **development payment adapter** that simulates webhooks.

### 25.1 Collecting Akoso's fee automatically

Schools never pay Akoso by transfer, and Akoso never chases them. Akoso's fee is deducted automatically from the school-fee payments that pass through Akoso, using Paystack's split payments: each payment settles straight to the school's bank account through its subaccount, and Akoso's share goes straight to Akoso's account. Akoso never receives or holds the school's money (section 14). Every plan, including Starter, collects fees through Akoso, so every school's fee can be deducted this way.

**Term ledger.** At the start of each term, compute what each school owes: `due = max(plan minimum, active students × price)`, plus VAT once Akoso is VAT-registered, minus any credit carried from last term. Track `collected` and `remaining` per school per term, updated from every successful payment (webhooks, plus a nightly reconciliation against the provider's transaction and payout records). Use a per-school lock so simultaneous payments don't overshoot.

**Card payments (exact).** When a parent pays by card, pass a flat platform charge for that single payment: 10% of the payment (the same rate as transfers), or the school's remaining amount if that is smaller. Once the term is paid, send no platform charge. Card payments therefore never overshoot.

**Transfers into family accounts (percentage switch).** Bank transfers into dedicated accounts can't carry a per-payment instruction, so the split is set on the school's subaccount (or a split group), which every family account of that school uses:

- While the term is unpaid, the platform percentage is on: 10% of each parent's payment as it arrives (not of the school's daily payout, which already arrives with Akoso's share taken out). The rate is a setting (default 10%, adjustable per school) and is the same for card payments and transfers. At 10%, a school owing ₦315,000 is paid off once about ₦3.15m of fees has come in through Akoso, usually in the first days of term.
- As `remaining` gets small, step the percentage down; when it reaches zero, set the percentage to 0%. **Never remove the split from a dedicated account**: removing it would send every later payment to Akoso's account instead of the school's.
- A small overshoot (payments landing while the switch changes) is credited to the next term and shown on the school's statement; if the school leaves, it is refunded from Akoso's account.
- The school's dashboard shows, for example, "Akoso fee this term: ₦210,000 of ₦315,000 collected", with each deduction listed. A receipt or tax invoice is issued automatically for the deductions.

**Paystack's fees.** The school always bears Paystack's processing fees, as it would without Akoso. Parents are never charged extra, and Akoso's share is counted in full, before Paystack's fee. On card payments, set the school's subaccount as the fee bearer. On transfers, Paystack charges its fee to Akoso's share while the split is on: use a split group with the school as fee bearer if Paystack confirms this works on dedicated accounts; otherwise add the fees Paystack charged to Akoso to the school's term balance, so deduction runs slightly longer and the school ends up bearing them. Show these fees on the school's statement.

**Backstop: direct debit.** At onboarding, every school sets up a Paystack Direct Debit mandate on its bank account (or, second best, a saved card authorisation) in favour of Akoso's own account. If collections through Akoso haven't covered the term's fee by a school-set week (default week 6), Akoso debits the shortfall automatically and tells the school. This also covers:

- schools whose parents mostly pay cash or into the school's own bank account;
- recovering refunds or chargebacks that Paystack charged to Akoso (section 14), as the school agreement allows.

**Monnify (backup provider).** Monnify reserved accounts support the same split, but the setting is per dedicated account, so switching the fee on or off means one update per account: run it as a queued, retried, idempotent job.

**Verify before relying on it.** Test in Paystack's sandbox, and get Paystack's written confirmation of:

- how quickly a changed percentage applies to the next transfer into a dedicated account;
- who bears Paystack's fee on dedicated-account transfers with a split, and whether a split group's fee-bearer setting is honoured on them;
- how refunds and chargebacks are divided between Akoso and the school on split payments;
- whether a zero platform charge is accepted on a card payment.
- that Akoso's percentage is calculated on the full payment amount, before Paystack's fee is taken from the school's side (e.g. on a ₦150,000 transfer at 10%: Akoso ₦15,000, school ₦134,700 after a ₦300 fee), so Akoso's ledger matches Paystack's records to the kobo.

Record the results in an ADR before building section 25.1, and keep the whole feature behind a feature flag until they are confirmed.

**Contract and tax.** The school agreement must authorise the deductions, the direct-debit backstop, and the recovery of refunds and chargebacks (indemnity and set-off). Store tax rates, Akoso's VAT registration status, each school's TIN and any withholding tax deducted as data with effective dates, like payroll (section 15). Invoices and receipts carry Akoso's TIN, a VAT line once registered, and sequential numbers, ready for the Nigeria Revenue Service's e-invoicing system when it applies to Akoso. For a fee passed to parents, the tax invoice goes to each parent who paid it (section 25); for a fee the school absorbs, it goes to the school.

## 26. Platform administration

Create a separate admin area for our team, on its own subdomain, with explicit server-side role checks and MFA.

Include:

- Tenant (school and group) management: create, configure, suspend, reactivate, close.
- A resettable demo tenant with realistic fake data for sales demos.
- **Public demo (for the website):** a read-only copy of the demo tenant that anyone can open from the website without signing up, with a visible "Demo" banner and a switch between proprietor, bursar, teacher and parent views. It resets every night and never contains real data.
- **Leads:** a leads table for website enquiries and demo bookings, with a simple pipeline (new → contacted → demo booked → won → lost), an owner, notes, the source (referral code and campaign tags) and the next follow-up date. New leads notify me by WhatsApp or email.
- **Sign-up approvals:** "Start your free term" requests from the website wait in a queue for my approval before a school is created; approval starts the onboarding checklist.
- **Agent applications:** agent sign-ups from the website, approved by me before an agent gets a referral code.
- **Plan information for the website:** a public, read-only endpoint (or a build-time export) of current plan names, prices and minimums, so the website never drifts from the app.
- **Platform-fee ledger (section 25.1):** for each school and term, the amount due, collected, remaining and carried forward, the current split setting, mandate status and any backstop debits.
- Onboarding tracker per school: setup steps done, import status, first invoice run, first report-card run, parent activation.
- Assisted migration tools (section 10).
- **Support sessions (impersonation):** an Akoso staff member sees a school's account as its admin sees it, only with the school's permission, for a limited time, and with a full record:
  - **Request:** support requests access from an open support ticket, giving a reason and a duration. Every session is linked to a ticket.
  - **Consent:** the school chooses in its settings between "ask every time" (the proprietor or admin taps Allow or Decline on an in-app request naming the ticket, reason and duration) and "standing permission while a ticket is open" (support may start at once, and the school is notified when it does).
  - **Time limit:** default 30 minutes, maximum 2 hours; the session ends automatically, and extending it needs the school's permission again. A banner on the support person's screen shows the school's name and the time left. The proprietor can end any session at any moment.
  - **View only by default:** support can look but not change anything. Changes need the school to tick "allow changes" for that session.
  - **Never allowed in a support session,** even with permission: moving or refunding money, changing fee, bank or platform-fee settings, exporting personal data, and viewing health records, restricted notes or custody restrictions. The school does these itself, with support guiding them.
  - **Record:** who opened the session, when, why, the linked ticket, every page viewed and every change made, and when it ended, in both Akoso's and the school's audit logs. When it ends, the school gets a short summary (e.g. "Viewed: Payments, the Okafor family statement. No changes made. Ended 10:42.").
  - **"Who accessed our school" page:** a list of every past support session in the school's settings, with each summary.
- **Account health alerts** that prompt a check-in call: report cards not published by week 12 of a term, fee invoices not issued by resumption, parent activation under 50%.
- Subscription overview, invoices, credit balances and agent commissions.
- Job queue status, worker health, failed jobs with retry, PDF render times.
- Payment health: webhook failures, reconciliation mismatches, unmatched-payment ageing, DVA usage vs provider limit.
- Messaging health: delivery rates by channel and network, credit consumption.
- Custom domain and certificate status per school; feature flags per tenant.
- Plan, price and tax-table configuration.
- Audit log viewer and security events.
- Support tickets with the tenant context attached.

### 26.1 In-app onboarding, help and support

- Role-based onboarding checklists (proprietor, admin, bursar, teacher, parent) that track progress inside the app.
- Contextual help links on every main screen, pointing to help-centre articles.
- A "contact support" button that opens a ticket or a WhatsApp chat with the school, user, role and current screen attached.
- Ticket priorities: P1 = the school cannot publish results or take payments (target first response within 1 hour); others by business hours (7 AM–7 PM weekdays, extended during resumption and results weeks). Track median first-response time.
- In-app links to a results-week checklist and a resumption-week fees checklist.

Acceptance: a new bursar completes the first invoice run without a support call.

### 26.2 Akoso team roles and access

Akoso's own staff follow least privilege, like school staff. **Akoso staff do not see children's records by default:** access to a school's data happens only through a support session the school has agreed to (the impersonation rules in section 26), which is time-limited and logged in both Akoso's and the school's audit logs.

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Owner** | Everything, including team roles, pricing, platform-fee settings, emergency switches and closing schools | — |
| **Support** | View a school's setup, settings and tickets; open a consented support session | Change money records or fee settings; export personal data |
| **Onboarding / migration** | Set up a school and run imports during its onboarding | Access the school after onboarding ends, unless the Owner grants it again for a set period |
| **Finance** | Akoso's platform-fee ledger, invoices, direct-debit mandates, credits and agent commissions | See children's records or school-fee details beyond totals |
| **Sales** | Leads, demos and sign-up requests | See any school's data |
| **Ops / engineering** | System health, job queues, provider status and logs (which hold no personal data) | See school records; change data outside a recorded break-glass session (section 28.3) |

- Add these roles to `docs/permissions.md` and generate tests from them, like school roles. One person can hold several roles.
- **Account security:** passkeys or security keys (not SMS codes) for the Owner and any role that touches money; short idle timeouts; re-authentication before risky actions (changing prices or platform-fee settings, emergency switches, closing a school, granting roles). While the Owner works alone, the riskiest changes also need a typed confirmation and take effect after a short delay (e.g. 10 minutes) that can be cancelled, as a substitute for two-person approval.
- Every Akoso staff action is audit-logged and appears in the quarterly access review (section 28).
- **Offboarding checklist:** when someone leaves, their access is removed the same day, their sessions and keys are revoked, and the change is logged.

### 26.3 Founder's dashboard

One screen for running Akoso as a business, built from data the platform already holds:

- Schools by stage: lead → free term → paying → grace period → left, with numbers moving between stages each term.
- Active students in total and per school.
- This term's platform fees: due, collected, remaining, carried forward, and how much came from the 10% deductions versus direct-debit backstop debits.
- Total school fees processed through Akoso, and Paystack fees as a share of them.
- Messaging revenue against its cost (margin per channel).
- Parent activation across schools.
- Support: open tickets, median first response, P1 incidents.
- Schools at risk of leaving (the account health alerts in section 26) and schools in grace period.
- Agent commissions owed and paid.
- Cost per active student (section 31).

### 26.4 Agent portal

Approved agents (section 26) sign in to a simple portal of their own, at the app address with an agent role, showing only:

- their referral link and QR code;
- their leads and referred schools, and each one's stage;
- commissions earned, pending and paid, with monthly statements;
- marketing materials to share (approved flyers, short videos, WhatsApp text).

Agents never see any school's data beyond a referred school's name, stage and the amounts their commission is based on. Commission payouts are recorded in the portal (paid manually or by bank transfer at first).

### 26.5 Emergency switches

Platform-wide controls for the Owner, each requiring re-authentication, logged, and shown on the status page where schools are affected:

- **Maintenance mode** for the whole platform or one school, with a message to users.
- **Pause WhatsApp or SMS sending** (all schools or one), e.g. if costs spike or a provider misbehaves; critical messages fall back to the remaining channels.
- **Pause platform-fee split changes** (section 25.1), holding the current split settings until resumed.
- **Switch payment collection from Paystack to Monnify** (section 14), following the payment-provider outage runbook (section 31).

### 26.6 Announcements to schools

- "What's new" notes shown in the app after a release, written in the brand voice.
- Planned-maintenance notices, sent ahead of time to proprietors and admins.
- Service messages to proprietors (e.g. a change to the terms or pricing, with the required notice).
- Targeting by plan, school or role. These are separate from the public status page.

### 26.7 When a school leaves

A guided exit process, so leaving is orderly and nothing is lost or kept longer than allowed:

1. The school gives notice; Akoso offers the full data export (section 23) straight away and again before closing.
2. The final term's platform fee is settled through the deductions or the direct-debit backstop; any credit owed to the school is refunded from Akoso's account.
3. Parents are told the school's payment accounts will close; dedicated accounts stop accepting payments on the closing date.
4. The school's access becomes read-only for a set period (e.g. 90 days), then closes.
5. After the retention period in the school's agreement, the school's data is deleted (or pseudonymised where records must be kept), and the school receives a written confirmation of deletion.

Every step is logged, and the platform admin shows each leaving school's progress.

## 27. Database design

Create normalised Drizzle migrations for tables such as:

- **Platform:** `groups`, `tenants`, `branches`, `users`, `memberships` (user × tenant × role), `sessions`, `audit_events`, `feature_flags`, `platform_settings`, `support_tickets`, `roles` and `role_permissions` (custom roles), `approval_requests` (two-person control), `domain_events` (outbox), `idempotency_keys`, `terms_acceptances`, `leads`, `signup_requests`, `agent_applications`, `platform_staff`, `platform_role_assignments`, `support_access_grants`, `emergency_switches`, `platform_announcements`, `tenant_exits`, `agent_commissions`, `agent_payouts`
- **Calendar:** `academic_sessions`, `terms`, `non_school_days`, `school_events`, `event_rsvps`
- **Structure:** `levels`, `classes`, `class_arms`, `curriculum_versions`, `subjects`, `class_subjects` (arm × subject × teacher × term)
- **People:** `students`, `guardians`, `families`, `student_guardians`, `staff`, `enrollments`, `authorised_collectors`, `medical_records`, `consent_records`, `documents`, `billing_accounts`, `sponsors`, `custody_restrictions`, `contact_change_requests`
- **Assessment:** `assessment_schemes`, `grading_schemes`, `traits`, `score_sheets`, `scores`, `score_changes`, `trait_ratings`, `comments`, `nursery_ratings`
- **Results:** `subject_results`, `term_results`, `result_snapshots`, `report_card_files`, `transcripts`
- **Fees:** `fee_items`, `discounts`, `invoices`, `invoice_lines`, `instalment_plans`, `payments`, `payment_allocations`, `family_credits`, `virtual_accounts`, `payment_events`, `unmatched_payments`, `refunds`, `invoice_line_payers`, `deposits`, `write_offs`, `receipt_counters`, `receipts`, `payment_moves`, `bank_statement_imports`, `bank_statement_lines`, `payouts`, `payout_items`, `disputes`
- **Finance:** `expenses`, `expense_categories`, `salary_structures`, `payroll_runs`, `payslips`, `tax_tables`, `statutory_deadlines`
- **Comms:** `notifications`, `message_templates`, `message_deliveries`, `credit_ledger`, `announcements`, `pta_slots`, `conversations`, `permission_slips`, `permission_responses`
- **Operations:** `attendance_records`, `staff_attendance`, `behaviour_records`, `sickbay_visits`, `pickup_codes`, `pickup_logs`, `homework`, `lesson_notes`, `absence_reports`, `staff_leave_requests`, `early_warning_flags`
- **Admissions:** `applicants`, `applications`, `entrance_exams`, `offers`
- **Billing:** `plans`, `subscriptions`, `subscription_invoices`, `usage_snapshots`, `agents`, `referrals`, `platform_fee_ledgers`, `platform_fee_entries`, `payment_mandates`, `tax_rates`
- **Imports:** `import_batches`, `import_rows`, `import_mappings`

Use:

- UUID primary keys, foreign keys, unique constraints and indexes led by `tenant_id`.
- `created_at`, `updated_at`, `created_by` on every table.
- Transactions for every multi-row money or results operation.
- Append-only tables for payments, allocations, audit events, credit ledgers and result snapshots.
- Every create, update and delete on tenant data is audit-logged with actor, tenant, the fields changed, and before and after values, **except sensitive fields** (health data, national IDs, bank details, restricted notes, custody restrictions): for those, log only that the field changed, never the value. Audit entries identify people by internal ID, not by name, so when the law requires someone's personal data to be deleted, their live records can be deleted or pseudonymised without editing the audit log or breaking its hash chain (section 28.3). Document this deletion procedure in the DPIA.
- Soft deletion only where justified (students, staff), never for money.
- Encrypted columns for staff bank details and any national identifiers (NIN, LIN).
- A documented data retention policy per table.

Also add `tenant_domains` (section 7.1) and `devices` for push tokens (section 5.1) to the platform tables. Provide complete migrations, RLS policies for every tenant table, and seed scripts for presets (NERDC subjects and subject limits, grading schemes, traits, tax tables, statutory deadlines) and a demo school.

## 28. Application security

Apply secure development practices throughout. Protect against:

- Broken access control and **tenant data leakage** (the top risk)
- SQL injection (use Drizzle's parameterised queries; no string-built SQL)
- Cross-site scripting (contextual output encoding; sanitise rich text)
- Cross-site request forgery
- Session hijacking and fixation
- Brute-force login and OTP abuse (rate limits, lockouts, alerts)
- Insecure direct object references (every ID lookup is tenant-scoped and permission-checked)
- Server-side request forgery (no user-supplied URLs fetched by the server)
- Open redirects, Host-header attacks and path traversal
- Insecure file uploads (allow-listed types, size limits, re-encoded images, private storage)
- Webhook spoofing and replay (signature verification, idempotency, timestamp checks)
- Mass assignment (Zod schemas define exactly which fields are accepted)
- Secrets exposure

Also implement:

- A strict Content Security Policy, HSTS, X-Content-Type-Options, Referrer-Policy and Permissions-Policy.
- Encryption in transit (TLS everywhere) and at rest; field-level encryption for staff bank details and national IDs.
- Signed, short-lived URLs (≤ 15 minutes) for every file and PDF.
- Least-privilege database roles and cloud credentials.
- Dependency and secret scanning in CI.
- An append-only audit log of score changes, approvals, fee items, discounts, payments, refunds, role changes, impersonation, exports and health-record views.
- A quarterly access review report: every staff and platform user with elevated roles, last login and MFA status, for the school and for us.
- An incident response runbook covering: payments down, messaging down, results corrupted, suspected data breach.
- An external penetration test or independent security review before launch (budget permitting); fix critical findings before go-live.

Never commit secrets, private keys or credentials. Never log passwords, OTPs, tokens, full card data or health details.

### 28.1 Security standards to follow

Security is part of every slice, not a final pass. Follow these recognised standards throughout, using their latest published versions, and treat any gap as a bug:

- **OWASP Top 10** (web applications): every item addressed by design, with tests where testable.
- **OWASP Application Security Verification Standard (ASVS):** target **Level 2** for the whole platform, plus selected **Level 3** controls where the risk is highest: authentication, sessions, payments, payroll, results approval and the platform admin area. Record in the checklist which Level 3 controls you adopted and why. Keep a checklist in `docs/security/asvs.md` mapping each requirement to the code or test that meets it, or a recorded reason it does not apply.
- **OWASP API Security Top 10** for `/api/v1`, webhooks and internal endpoints (object-level and function-level authorisation on every call, rate limits, no excessive data exposure, inventory of every endpoint).
- **OWASP Mobile Top 10 and MASVS** for the Expo apps (secure token storage, certificate pinning decision recorded in an ADR, no secrets in the app bundle, protection against tampered or rooted devices where practical).
- **OWASP Cheat Sheet Series** as the default reference for implementation details (authentication, session management, password storage, file upload, CSRF, XSS, logging, secrets).
- **CWE Top 25** weaknesses checked by static analysis.
- **Payment card rules:** no card data ever touches Akoso's servers; checkout uses the provider's hosted page or SDK, so PCI DSS scope stays minimal.

### 28.2 Secure development lifecycle

- **Threat model before building.** Each spec for a feature touching auth, money, results, personal data, files or tenancy includes a short threat model (STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) with the mitigations, reviewed by me.
- **Automated checks in CI, failing the build on high or critical findings:**
  - static analysis (SAST, e.g. Semgrep and CodeQL) with security rule sets
  - dependency vulnerability scanning (e.g. `pnpm audit`, OSV-Scanner, Dependabot/Renovate alerts)
  - secret scanning (e.g. gitleaks) on every commit and pull request
  - container image scanning (e.g. Trivy)
  - infrastructure and configuration scanning for misconfigurations
  - a dynamic scan (DAST, e.g. OWASP ZAP) against staging on a schedule and before each release
- **Security tests** for every OWASP Top 10 category that can be tested: injection, broken access control (including cross-tenant attempts), XSS, CSRF, SSRF, insecure file upload, authentication and session attacks, rate-limit bypass.
- **Review:** all security-sensitive changes get the cross-model review in section 3 plus my approval. Never disable a security check to make a build pass; raise it with me instead.
- **Penetration test** by an independent tester before launch and after major changes; fix critical and high findings before go-live, and record accepted risks with my sign-off.
- **Vulnerability handling:** a `SECURITY.md` and `/.well-known/security.txt` with a contact for responsible disclosure; patch critical vulnerabilities within 72 hours and high ones within 14 days.

### 28.3 Tamper resistance and tamper evidence

The platform must make tampering with results, money and records extremely hard, and make any attempt visible and traceable. No system can honestly be called "tamper-proof", so build for **tamper-resistant and tamper-evident**, and never describe it as tamper-proof to customers.

- **Server is the only source of truth.** Never trust anything computed or sent by a browser or app: totals, grades, positions, balances, prices, discounts, roles and tenant IDs are always recomputed or re-checked on the server.
- **Immutable records.** Payments, allocations, refunds, credit-ledger entries, result snapshots, payslips and audit events are append-only. Corrections are new entries that reference the original, with a reason. Enforce this in the database (revoke `UPDATE` and `DELETE` for the application role on these tables, or block them with triggers), not only in code.
- **Hash-chained audit log.** Each audit event stores a hash of its content and of the previous event for that tenant, so any edited, deleted or inserted event breaks the chain. A daily job verifies the chain and alerts me on any break. Copy audit events daily to write-once storage (object storage with object lock) outside the main database. Because audit entries hold internal IDs, not names or sensitive values (section 27), personal data can be deleted or pseudonymised elsewhere without breaking the chain.
- **Signed results and receipts.** When results are approved and published, store a cryptographic hash of each snapshot. Report cards, transcripts and receipts carry a verification QR code (section 12) that checks the document against the stored signature, so an edited PDF or a forged receipt is detected.
- **Two-person control for high-risk actions:** unlocking approved results after publishing, large discounts and write-offs, refunds above a threshold, payroll approval, changing a school's settlement bank account, and bulk deletions require a second authorised person to approve. Changes to the settlement account also trigger a notification to the proprietor and a cooling-off period before payouts use the new account.
- **Integrity checks on money:** a nightly job proves every kobo balances (payments = allocations + credits + unmatched), compares against the provider's records, and alerts on any difference.
- **Webhook and job integrity:** signatures and timestamps verified, replay rejected, every event stored raw before processing.
- **Least privilege everywhere:** separate database roles for the app, worker, migrations and read-only reporting; no shared admin accounts; production access only through audited, time-limited break-glass access with MFA.
- **Supply-chain integrity:** committed lockfile with exact versions, CI that installs with a frozen lockfile, GitHub Actions pinned to commit SHAs, protected main branch with required reviews and status checks, signed commits, a software bill of materials (SBOM) for each release, and build provenance for container images.
- **Client tampering:** the PWA and mobile apps only hold data the user may see; offline data is scoped to the signed-in user and cleared on logout; all offline operations are re-validated on sync, including permissions and locked states.
- **Detection and response:** alerts for unusual activity (many failed logins, score changes after approval, bulk exports, permission changes, settlement-account changes, impersonation, activity from new countries), visible to me and to the school's proprietor where relevant, and covered by the incident runbook.

Keep `docs/security/` up to date with the threat models, the ASVS checklist, scan results summaries, pen-test reports and accepted risks.

### 28.4 Pre-launch security checklist

Before the pilot readiness gate and again before launch, go through this checklist, verify each item against the actual code and running staging environment (not just the documentation), and record the result, evidence and any fix in `docs/security/pre-launch-checklist.md`. Every item must pass or have a risk I have accepted in writing.

1. **API keys and secrets hidden:** no secret in client code, mobile bundles, logs or error messages; only deliberately public values use the `NEXT_PUBLIC_` (or Expo public) prefix; secrets live only in the secret store.
2. **Git history clean:** scan the full history for secrets; any secret ever committed is rotated immediately and, where needed, removed from history.
3. **No database credentials on the client:** browsers and apps never talk to the database directly; only the server uses the least-privilege app role.
4. **Row-level security on** and forced on every tenant table, proven by the isolation tests.
5. **Sensitive data encrypted** at rest and in transit (bank details, national IDs, health data).
6. **Authentication and authorisation on the server** for every page, action, API route, file and job.
7. **Record-level access locked:** every lookup by ID checks tenant and ownership (no reading another family's invoice by changing an ID).
8. **Field tampering blocked:** only fields in the Zod schema are accepted; roles, tenant, prices, totals and statuses can never be set from the client.
9. **Session cookies secure:** HttpOnly, Secure, SameSite, short-lived, rotated on login and privilege change.
10. **Passwords hashed** with a modern slow algorithm (Argon2id or scrypt, as Better Auth supports); OTPs stored only as hashes and expire quickly.
11. **Login and OTP rate-limited** per account, phone number, IP and tenant, with lockout and alerts.
12. **Bot and abuse protection** (e.g. Cloudflare Turnstile) on public forms, sign-up, OTP requests and the admissions page, plus OTP limits per phone number and country to prevent SMS-pumping fraud that would burn message credits.
13. **Queries parameterised** everywhere; no SQL built from strings.
14. **All input validated** on the server, including webhooks, imports and offline sync.
15. **User content escaped** on output, and rich text sanitised.
16. **File uploads restricted:** allowed types, size limits, content checks, re-encoded images, private storage, no execution.
17. **API responses trimmed:** responses use explicit output schemas and return only the fields the caller needs, never whole database rows or other users' data.
18. **Security headers** set (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protection).
19. **HTTPS forced** everywhere, including custom domains, with HSTS and no mixed content.
20. **Errors and logs safe:** no stack traces, SQL or internal details shown to users; logs free of personal data and secrets.


## 29. Privacy and NDPA compliance readiness

The platform processes children's personal data under Nigeria's Data Protection Act 2023 and the NDPC's General Application and Implementation Directive (GAID) 2025. Each school is the **data controller**; the platform is the **data processor**. Under the NDPA, a child is anyone under 18.

Build these product features:

- **Guardian consent ledger:** a versioned privacy notice per school; consent captured per child with timestamp and channel; student accounts (section 43) only after guardian approval (verifying the guardian, as NDPA s.31 requires); no marketing to children. The ledger also records photo and media consent per child (ID cards, the school's website and social media, newsletters), each a separate yes or no the guardian can change, and features that use photos respect it.
- **Terms acceptance:** record which version of the terms of service and the data processing agreement each school accepted, when and by whom, and ask again when they change.
- **Data subject requests:** access, correction and deletion requests logged and fulfilled; a full export of a person's data in under 5 minutes.
- **Data retention settings:** per data type, with automatic archiving of withdrawn students and deletion when lawful.
- **Health and sensitive data:** restricted roles, audited views, minimal collection.
- **AI data minimisation:** no names or identifiers sent to the AI provider (section 11), only scores, trends, trait ratings and attendance; each school can turn AI drafts off; documented in the DPIA, including the cross-border transfer to the AI provider.
- **Sub-processor register:** hosting, Paystack, Monnify, Termii, Meta, email provider, AI provider; shown to schools.
- **Breach workflow:** internal incident record, impact assessment, notification to the NDPC within 72 hours and to affected schools without delay.
- **School compliance helper:** a checklist in school settings for the school's own NDPC registration as a data controller (with renewal reminders), its privacy notice and its consent status.
- **School data export** at any time and on exit.

Provide templates (for legal review, not as final documents):

- Privacy notice for parents and staff
- Data processing agreement between the platform and each school
- Terms of service, acceptable use policy, SLA (99.5% monthly uptime target, excluding planned maintenance outside school hours) and refund policy
- Agent agreement
- Data protection impact assessment outline
- Breach response runbook
- Parent consent form for school-fees payment accounts (section 29.1)

Do not claim legal compliance or certification. State in the documentation that a Nigerian data-protection lawyer and a licensed Data Protection Compliance Organisation must review all legal documents and the platform's NDPC registration tier.

### 29.1 Parent consent form for payment accounts

Dedicated account numbers are created only after the school confirms a parent's consent (section 14). Provide the text below, unchanged except for the placeholders, as `docs/legal-templates/parent-payment-account-consent.md` and as a printable one-page PDF in the school onboarding pack, for schools to add to their enrolment or fee forms (or send home as a slip for existing families). Mark it "for legal review". In Akoso, the bursar records "consent received" per payer (one by one or in the import file), the consent ledger stores who confirmed it and when, and withdrawing consent stops new payments into that account and switches the family to card or bank-statement payments. Collect it once per payer: separated parents and sponsors each sign their own.

> **School fees payment account: parent consent**
>
> [School name] uses Akoso to manage school fees. To make paying easier, we can give you your own fees account number. Any money you transfer into it is recorded straight away against your child's fees, and you get a receipt automatically.
>
> To create this account, we share your name, phone number and email address with Akoso and its payment partner, Paystack, and Paystack's partner bank. Your name will appear on the account, after the school's name (for example, "[SCHOOL NAME] / [YOUR NAME]"), so you can confirm you are paying the right school.
>
> Please note:
> - This account is only for paying school fees to [School name]. It is not a personal bank account: you cannot save in it or withdraw from it, and all money paid into it goes to the school.
> - We do not need your BVN for this account.
> - Your details are used only to create and run this account, as explained in our privacy notice: [link or "available from the school office"].
> - You can withdraw your consent at any time by telling the school office. You can then pay by card or into the school's bank account instead.
>
> ☐ **I agree** that [School name] may create a school fees account number in my name, as described above.
> ☐ **I do not agree.** I will pay by card or into the school's bank account.
>
> Parent or guardian's name: ______________________
> Child's / children's names: ______________________
> Phone number: ______________________
> Signature: ______________________ Date: ____ / ____ / ________

## 30. Testing

Create automated tests for:

- **Results engine (golden files):** real anonymised report cards and broadsheets from 5 schools, covering ties, absent and exempt students, missing CA, mid-term transfers, nursery rubrics and third-term cumulative averages. The engine must reproduce them exactly. Golden files hold real children's data until anonymised: run them through an anonymisation script (names, admission numbers, photos and contacts replaced consistently) before they enter the repository, keep raw files out of the repository and shared drives, and delete them once anonymised.
- **Fee allocation (property-based):** randomly generated invoices, discounts, part payments, overpayments, sibling splits, refunds and reversals. Invariant: no kobo is created or lost.
- **Tenant isolation:** for every table, tenant A cannot read, insert, update or delete tenant B's rows; also through the API and file downloads.
- **Authorisation:** tests generated from the permissions matrix for every role and action.
- **Authentication:** OTP, MFA, lockout, session rotation, password reset.
- **Payments:** webhook signature verification, duplicate and out-of-order webhooks, nightly reconciliation, unmatched queue, DVA creation, provider fees, bank-statement import (no duplicates on re-upload), payout matching, moving payments, shared payers, write-offs, gapless receipt numbers under simultaneous payments, and the platform-fee ledger (no overshoot on cards, the percentage switch never removes a split, the backstop debit).
- **Imports:** malformed files, duplicates, rollback, saved mappings.
- **Offline sync:** queued operations, conflicts, no data loss.
- **PDF generation:** report cards render correctly for each template; size and time limits.
- **Payroll:** PAYE, pension and NHF calculations against worked examples from an accountant.
- **Session rollover:** promotion, balances carried forward, reversal.
- **Messaging:** fallback, credits debited only on delivery, quiet hours.
- **Time zones:** payments, registers, cash-ups and scheduled messages around midnight WAT land on the right day, term and report.
- **Accessibility:** automated checks (e.g. axe) on every screen in CI, plus a manual keyboard and screen-reader pass on key flows before each pilot and before launch.
- **End-to-end (Playwright):** setup wizard, score entry to published report card, invoice to payment to receipt, parent login and payment, on a mobile viewport throttled to 3G with low-end Android emulation.
- **Load (k6):** results week (600 report cards per school, many schools at once) and resumption week (1,000 webhooks per minute). Run before the pilot readiness gate and before launch.

Include negative tests and malformed input for every endpoint. Use local fixtures, provider test modes and simulated webhooks. Never use real children's data in tests. Document how to run every test suite locally in `docs/testing.md`.

## 31. DevOps and operations

Set up:

- **Environments:** dev (local Docker Compose), staging (production-like, synthetic data) and production.
- **CI/CD (GitHub Actions):** typecheck, lint, unit, golden-file, property, tenant-isolation and integration tests on every pull request; automatic deploy to staging; manual approval to production; one-click rollback.
- **Migrations:** reviewed, reversible where possible, run by the migration role only.
- **Feature flags** per tenant for gradual rollout.
- **Change freeze:** no production deploys during a pilot or customer school's result week or resumption week, except urgent fixes.
- **Observability:** Sentry for errors, uptime checks from Nigeria, structured logs, product analytics (e.g. PostHog: activation funnels by role, feature-flag exposure), queue depth, PDF render time, webhook failure and reconciliation mismatch alerts sent to my phone.
- **Pilot metrics** (on a platform-admin screen, per school): time to produce report cards, result errors reported by parents, DVA auto-match rate, share of fee money arriving through family accounts versus the school's own bank account, unmatched-queue age, bursar reconciliation time (baseline vs pilot, entered by us), parent activation rate, message cost per family, support tickets per 100 students, and support median first-response time.
- **Backups:** managed Postgres point-in-time recovery; nightly encrypted logical export to a second region; object storage versioning. Recovery point ≤ 15 minutes, recovery time ≤ 4 hours. Restore drill every term; a restore into staging must be proven in under 2 hours.
- **Status page** for schools and an incident communication template.
- **Cost tracking** per tenant and per active student: messaging, storage and PDF compute.
- **Hosting region** chosen by measured latency from Lagos, Abuja and Port Harcourt; the cross-border data transfer basis documented.
- **On-call rota** and escalation, ready before launch.
- **Runbooks** in `docs/runbooks/` for deploys, rollback, restore, payment-provider outage (switch to Monnify), messaging outage, results corrupted and data breach; post-mortem template.

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

## 33. Deliverables

Provide:

- Complete, working source code in the monorepo structure:

```
apps/
  web/        # Next.js: the app at app.akoso.ng (PWA for parents and staff, admin screens, /api/v1) and school public pages
  admin/      # platform admin area (or a route group in web)
  worker/     # background jobs: PDFs, messages, payments, domains, reminders
  mobile/     # Expo app foundation (section 5)
packages/
  core/       # use-case services shared by server actions and /api/v1
  db/         # Drizzle schema, migrations, RLS policies, withTenant()
  domain/     # pure logic: results, fee allocation, payroll
  schemas/    # shared Zod schemas
  api-client/ # typed client generated from OpenAPI
  providers/  # payments, sms, whatsapp, email, pdf, ai, domain adapters
  ui/         # shadcn-based design system
docs/
  brief/ specs/ adr/ runbooks/ legal-templates/ help/ security/
  PRD.md  ARCHITECTURE.md  ARCHITECTURE-ESSENTIALS.md  risks.md  progress.md  decisions.md  founder-checklist.md
  permissions.md  testing.md  mobile.md  velocity.md  brand-voice.md  glossary.md  tech-debt.md
AGENTS.md     # rules for all coding agents (single source of truth)
CLAUDE.md     # Claude Code notes + pointer to AGENTS.md
GEMINI.md     # Gemini notes + pointer to AGENTS.md
```

- Database migrations, RLS policies and seed scripts (presets and demo school).
- `README.md` with local setup in under 15 minutes on Windows, macOS or Linux.
- `.env.example` with every variable explained.
- API documentation for internal endpoints and webhooks.
- Help-centre content in `docs/help/`: role-based guides for proprietors, bursars, teachers and parents; scripts for 2-minute videos in English and Pidgin; a results-week checklist; a resumption-week fees checklist; and a training outline for two 60-minute sessions per school (admin/bursar and teachers).
- Deployment guide, backup and restore guide, and runbooks.
- Legal and privacy templates marked "for legal review".
- A changelog.

## 34. Definition of done

A feature is done only when:

- [ ] Its spec in `docs/specs/` is approved and matches what was built.
- [ ] Typecheck, lint and all tests pass in CI, including tenant-isolation tests.
- [ ] Permissions are enforced on the server and covered by tests.
- [ ] Security checks in CI pass (SAST, dependency, secret and container scans), the relevant OWASP and ASVS items are met and recorded, and a threat model exists where section 28.2 requires one.
- [ ] It works on a 2 GB Android phone on a throttled 3G connection.
- [ ] Loading, empty, error and offline states are designed.
- [ ] It meets WCAG 2.2 AA and passes the automated accessibility checks (section 4.1).
- [ ] Dates and times follow the time-zone rules in section 3.1.
- [ ] Sensitive actions write to the audit log.
- [ ] Money is in integer kobo and results come from snapshots.
- [ ] The code follows section 3.1: module boundaries respected, no `any`, no lint or unused-code warnings, no circular dependencies, and the module README updated.
- [ ] Any shortcuts are recorded in `docs/tech-debt.md`.
- [ ] `ARCHITECTURE-ESSENTIALS.md`, `ARCHITECTURE.md` and `AGENTS.md` still match the code.
- [ ] `docs/progress.md` is updated, any decision you made is recorded in `docs/decisions.md`, and any new founder task is added to `docs/founder-checklist.md`.
- [ ] Help-centre text and the changelog are updated.
- [ ] User-facing text follows the Akoso voice (section 4.0).
- [ ] Estimated and actual hours are recorded in `docs/velocity.md`.
- [ ] It is deployed to staging behind a feature flag and I have reviewed it.

Never describe the platform as "fully compliant" or "error-free". Report honestly what was built, what was tested, and what still needs my decision.

---

# Part 2: Optional modules

## 35. Rules for Part 2

- **Start only when I say so.** Part 2 begins only after I declare the core platform (Part 1) complete and stable in production. Do not build any of these modules, or placeholder screens for them, before then.
- **Build order:** timetable, student accounts phases 1 and 2, CBT, store, transport, hostel, library, student accounts phase 3, visitor log, unless I give a different order. One module at a time, each as its own vertical slice with a spec in `docs/specs/` approved by me first.
- **No core rework.** Each module plugs into core services: fees through invoice lines and family accounts (sections 13–14), messaging through the notifications outbox and credits (section 17), people from section 9, gate checks from section 21, and permissions through the central check (section 6). Database changes are additive migrations only. If a module needs a change to a core table or service, stop and ask me.
- **Switchable per school.** Each module sits behind a per-tenant feature flag and is gated by plan (Premium by default, configurable as plan data, section 25). Turning a module off hides it without deleting its data.
- **Same standards as the core:** RLS forced on every new table with tenant-isolation tests, permissions added to `docs/permissions.md` with generated tests, money in integer kobo, audit logging, mobile-first, help-centre text and changelog updated, the code-quality rules in section 3.1 (each module is its own feature module with a public interface and README), and the definition of done in section 34.
- **Contract-ready specs.** Write each module's spec so a contract developer could build it alone.
- Effort estimates below are in developer-weeks with AI agents (about 8 in total). Record actuals in `docs/velocity.md`.

## 36. Timetable

Manual timetable builder with clash detection. No automatic solver.

- Bell schedule per level: school days, periods with start and end times, breaks and assembly.
- Rooms (classrooms, labs, halls) with optional capacity.
- Place a subject, teacher and room into each period for each class arm, by tapping a cell or dragging on desktop.
- Clash detection when saving: the same teacher, room or class arm in two places at once is blocked; a teacher above a school-set weekly period limit gets a warning.
- Check that each subject receives its configured periods per week, and show any shortfall.
- Views and printouts: per class arm, per teacher, per room, and a master timetable (A4/A3 landscape PDF and Excel).
- Teachers see their own timetable in the teacher workspace (section 19). Parents see their child's class timetable in the parent app.
- One timetable per term, with copy-from-previous-term.
- Tables: `bell_schedules`, `periods`, `rooms`, `timetable_entries`.
- Effort: 1.0. Depends on school structure (section 8) and staff (section 9).

Acceptance: no double-booked teacher, room or class arm can be saved; a full timetable prints legibly per class and per teacher.

## 37. Computer-based tests (CBT)

Treat CBT as a high-risk area: exam-day load and integrity get extra tests and my review.

- **Question bank** per subject and class level: single-choice, multiple-choice and true/false questions, with optional images and simple maths notation; tags by topic and difficulty; Excel import of questions; question versioning, so editing a question never changes a test already taken.
- **Test set-up:** duration, start and end window, number of questions drawn from the bank, randomised question and option order per candidate, marks per question, pass mark, attempt limit, and whether candidates see their score at the end.
- **Candidates:** students (class tests and exams) or applicants (entrance exams linked to admissions, section 22).
- **Exam delivery:**
  - Candidates log in with a one-time exam code.
  - Each candidate can have only one active session.
  - The countdown is controlled by the server.
  - Every answer is autosaved, locally first and then to the server.
  - A candidate can resume on another computer after a crash or disconnection, with the time already used counted.
  - Tests auto-submit when time ends.
- **School labs:** the exam must survive unreliable internet in a school computer lab on the local network. Answers queue locally and sync when the connection returns. Write an ADR on whether a local relay server in the lab is needed, and ask me before building one.
- **Invigilator dashboard:** who has started, progress, time remaining, connection status; extend time for a candidate with a reason (audited). Tab switching and focus loss are logged and flagged, never auto-penalised.
- **Marking and results:** objective questions marked automatically; item analysis (percentage correct per question); push scores into a chosen score-sheet component (e.g. CA2) as a draft that the teacher reviews before submitting (section 11); entrance-exam scores go to the applicant record.
- Tables: `question_banks`, `questions`, `question_versions`, `cbt_tests`, `cbt_sessions`, `cbt_answers`, `cbt_results`.
- Effort: 1.5. Depends on score sheets (section 11) and admissions (section 22).

Acceptance: a k6 load test with 300 concurrent candidates shows no lost answers; killing a candidate's browser mid-test and resuming loses at most the answer being typed; scores reach the score sheet only after teacher review.

## 38. Store (uniform and bookshop)

- Items with variants (e.g. uniform sizes), selling price in kobo and optional cost price, linked to class levels (e.g. JSS1 book list).
- Stock in (purchases, with supplier), stock out (sales and issues), and adjustments with a reason (damage, loss, count correction). All stock movements are append-only.
- Sale to a student charged to the student's billing account (added as a fee line, so it reconciles through section 14), or paid immediately in cash, POS or transfer.
- Issue log for items given to a student (e.g. textbooks included in fees), with date and staff name.
- Bundles (e.g. "JSS1 starter pack") and bulk issue to a class.
- Low-stock alerts, a stock valuation report, sales by item and period, and a daily store cash-up.
- Tables: `store_items`, `store_variants`, `stock_movements`, `store_sales`, `store_sale_lines`, `store_issues`.
- Effort: 1.0. Depends on fees and invoicing (section 13).

Acceptance: stock never goes negative; every sale charged to a family appears on the family statement; the stock count equals the sum of movements.

## 39. Transport

No GPS tracking (out of scope, section 24).

- Routes with ordered stops, vehicles (plate number, capacity) and assigned drivers and bus minders (staff records).
- Students assigned to a route, stop and direction (morning, afternoon or both) per term.
- The bus fee is added automatically as an optional fee item (section 13) for assigned students, with an amount per route or per stop.
- Daily manifest per route and run, on the driver's or minder's phone, works offline (section 20).
- Mark each student as boarded or alighted with a tap; absent from the bus is flagged against the attendance register.
- Optional parent notification on boarding and drop-off (push first; SMS/WhatsApp use credits, section 17).
- Capacity warnings when assignments exceed a vehicle's seats.
- Tables: `vehicles`, `routes`, `route_stops`, `transport_assignments`, `transport_runs`, `transport_events`.
- Effort: 0.5. Depends on fees (section 13) and student attendance (section 21).

Acceptance: the driver or minder marks each pickup and drop-off, offline if needed, and every event syncs with time and staff name.

## 40. Hostel and boarding

- Hostels (houses), rooms and beds, with a house master or matron role (added to the permissions matrix).
- Bed allocation per term; move and swap with history; allocation report per hostel.
- The boarding fee is added as a fee item for allocated students (section 13).
- **Exeat:** a parent requests leave in the parent app (dates and reason). The house master or head teacher approves it. Gate staff verify the approved exeat and the collector using the pickup-safety flow (section 21). Departure and return times are logged, and late returns are flagged.
- Boarding roll call (night and morning) using the attendance pattern from section 21.
- Optional boarders' welfare notes, held as restricted notes under the same rules as behaviour and health (section 21).
- Tables: `hostels`, `hostel_rooms`, `beds`, `bed_allocations`, `exeat_requests`, `boarding_roll_calls`.
- Effort: 0.75. Depends on people (section 9), fees (section 13) and pickup safety (section 21).

Acceptance: no bed can be allocated to two students in the same term; every exeat release and return is logged with time and staff name.

## 41. Library

- Catalogue: title, author, ISBN, subject, class level, shelf location, number of copies; each copy has its own barcode or QR label (printable label sheets).
- Issue and return to students and staff by scanning with a phone camera, in under 10 seconds.
- Loan rules: loan period and maximum books per borrower type; due dates.
- Overdue list, overdue reminders to parents (push first, credits for SMS/WhatsApp), and an optional lost or damaged book charge added to the student's billing account (section 13).
- Borrowing history per student and popular-titles report.
- Tables: `library_titles`, `library_copies`, `library_loans`.
- Effort: 0.5. Depends on people (section 9).

Acceptance: issue or return by scan takes under 10 seconds; a copy cannot be issued while already on loan.

## 42. Visitor log

- Gate or front-desk staff sign visitors in: name, phone, organisation, host (staff member), purpose, optional photo, time in and time out.
- Pre-registered visitors: staff create an expected visit, and the visitor receives a QR code to show at the gate.
- Printable visitor badge (or on-screen QR), and a notification to the host on arrival.
- Daily visitor list and a report of visitors still on site.
- Visitor data is personal data: apply a retention period (default 12 months, configurable) and include it in the data-retention settings (section 29).
- Tables: `visitors`, `visits`.
- Effort: 0.25. Depends on core roles (section 6).

Acceptance: a walk-in visitor is signed in within 60 seconds; every visit has a time in, and time out is either recorded or flagged at the end of the day.

## 43. Student accounts (Akoso Student)

Student accounts let secondary-school students see their own school life in the Akoso app and do their schoolwork there. Treat this as a high-risk area: it holds children's data and gives children their own login. It needs a threat model (section 28.2), an updated DPIA (section 29) and my review before each phase is released.

Build it in three phases, each with its own spec approved by me and its own checkpoint. Phase 3 items appear only when the module they depend on is switched on.

**Who can have an account**

- Only students in class levels the school switches on: JSS1 to SS3 by default, set per level in school settings. Never Nursery or Primary; younger children stay under their parents' accounts.
- An account is created only after the school records the guardian's consent for that child in the consent ledger (section 29), using a student-account consent form the school collects on paper or as a signed upload, in the same way as the payment-account consent (section 29.1). Consent is never collected through the app. Draft the form and a plain-language student privacy notice (written for 10 to 17-year-olds) in `docs/legal-templates/`, marked "for legal review".
- If a guardian withdraws consent or the student leaves the school, the account is disabled the same day; its data then follows the retention settings (section 29).
- Students use the same Akoso app as everyone else: the PWA at `app.akoso.ng` (section 4.0) and, once it is built, the Expo app (section 5), with the same sign-in and the same features in both. After sign-in they see only the student experience. A student account cannot hold any other role.
- The module follows the Part 2 rules (section 35): switchable per school and gated by plan.

**Sign-in (the one core change this module makes)**

- Students do not need a phone number or email address. They sign in with the school code, their admission number and a PIN of at least 6 digits, or by scanning the QR code on their student ID card and entering the PIN.
- The school prints a sign-in slip per student with the school code, admission number, a first-time PIN and the QR code; the form teacher hands the slips out. The first-time PIN must be changed at first sign-in.
- **Forgotten PIN:** the form teacher or a school admin can reset it, and so can a linked parent from the parent app ("Reset my child's PIN"), so a forgotten PIN at home does not wait for school. The other side is notified (the parent when staff reset it; the form teacher's list shows parent resets), and every reset is audit-logged.
- Lock the account after repeated wrong PINs (rate-limited per admission number and per device); the form teacher can unlock it.
- **Shared computers:** schools often use one computer lab. The student sign-in screen has a "This is a shared computer" box, ticked by default; the school can also register lab computers so the box is always ticked there. On a shared computer the session ends after a short idle time (default 10 minutes, configurable), nothing is remembered, and closing the browser signs the student out. On the student's own device, the session lasts longer (set by the school, default 30 days) and the PIN is asked again after the app has been closed for a while.
- **Shared family phones:** a student may sign in on a parent's phone. The parent's and the student's sessions are kept separate; switching from the student back to the parent account requires the parent to sign in again (OTP, or the phone's own lock if the parent has turned that on), so a child can never open the parent's view.
- This sign-in method changes the core authentication set-up (section 6), and I approve that change as part of this module. Write an ADR first. Add it as a separate sign-in method with its own session rules, available to both the PWA and the Expo app through the same API (section 5.1); do not change how parents or staff sign in.

**What students never see or do**

- Fees, balances, invoices, payments, receipts or anything about family finances. If the fee gate (section 12) withholds online results, the student sees "Your results are not available yet. Please ask your parent or the school office", with no mention of fees.
- Other students' scores or data, rankings or league tables. A student sees only their own report card, exactly as the parent sees it.
- Restricted pastoral notes, health records, custody restrictions, early-warning flags (section 23) or staff comments meant for staff only.
- Messages between students, private chats with staff, social feeds, public leaderboards, an open AI chat, advertising, or third-party analytics and trackers. The student experience collects only what its features need.

**Phase 1: student portal (read-only)**

- **Home:** today's classes (from the timetable once section 36 is built), homework due soon and the latest announcements.
- **My calendar:** terms, holidays, exam dates and events from the school calendar (section 8).
- **My attendance:** the student's own attendance record (section 21).
- **My results:** released results and report cards only, available at the same moment as for parents (section 12), with a simple progress chart across terms.
- **Announcements screen:** staff can choose students as an audience by class arm, level or the whole school (section 17). Every announcement for the student appears on an Announcements screen, newest first, so students see it whenever they next sign in, whether or not they were signed in when it was sent:
  - Unread announcements are marked, the menu shows an unread count, and the latest unread ones appear on the home screen after sign-in.
  - Staff can pin an important announcement (e.g. an exam timetable change or a closure) so it stays at the top until a date they set.
  - Each announcement can have an expiry date, after which it leaves the screen.
  - Staff see a read count (e.g. "142 of 180 students have seen this"), not a list of who has not read it.
  - Push notifications are an optional extra for students who have installed the app on their own device and allowed notifications. No SMS or WhatsApp credits are spent on students.
- **SS3 reminders:** WAEC, NECO and JAMB registration and exam dates, entered by the school as calendar events, with reminders.
- **Digital student ID card:** name, class, admission number and a photo (only with photo consent, section 29), and a signed QR code that the gate, library and CBT can scan. The QR carries an opaque, revocable token, never personal data.
- **Parents' view:** in the parent app, a "What my child sees" page and the student's last sign-in time.

**Phase 2: learning**

- **Homework (section 19) for students:** a list with due dates and attachments, downloadable for offline reading (section 20). Students submit photos or files before the deadline (file rules from section 28: allowed types, size limits, images re-encoded); late submissions are marked late. Teachers mark each submission and add a short comment and an optional score. A teacher can push homework scores into a score-sheet component as a draft to review before submitting (section 11), as with CBT. Submissions a parent makes for a child without a student account work as before.
- **Learning materials:** teachers share notes, past questions and links per subject and class arm, which students can download for offline reading. Storage limits per school come from plan data (section 25).
- **"Ask about this homework":** a question thread attached to one homework item, between the student and the subject teacher. It is not a chat:
  - It is always visible to the form teacher, the head teacher and the safeguarding lead, and it stays with the homework.
  - Text and images only. Staff can close a thread or hide a message, with a reason that is recorded.
  - A "Report" button sends a thread to the safeguarding lead.
  - The school can switch threads off.
- This is not a full LMS (section 24): no video classes, discussion forums or quizzes outside CBT.

**Phase 3: connected modules (each only when that module is switched on)**

- **CBT (section 37):** practice tests and mock exams the school opens to students, taken from the student account instead of a one-time exam code, with JAMB-style timing for SS3. Practice scores never go into score sheets. Real class tests and exams keep the one-time exam code and invigilation.
- **Library (section 41):** the student's loans, due dates and overdue notices; books are issued by scanning the student ID QR code.
- **Timetable (section 36):** the full weekly class timetable.
- **Clubs and prefect duties:** clubs and societies with members and meeting times, set up by staff; prefects see the duty rosters staff give them. Students cannot record anything about other students.

**Audit and safeguarding:** audit-log account creation, disabling, PIN resets, consent changes, hidden messages and reports. The safeguarding lead can see all homework threads for the school.

- Tables: `student_accounts`, `student_id_tokens`, `shared_devices`, `announcement_reads` (reusing the core `announcements` table), `homework_submissions`, `homework_feedback`, `homework_threads`, `homework_thread_messages`, `learning_materials`, `clubs`, `club_members`, `prefect_duties`. Reuse the consent ledger (section 29) for student-account consent; do not create a separate consent table.
- Effort: 2.5 (phase 1: 1.0, phase 2: 1.0, phase 3: 0.5). Depends on people (section 9), results (section 12), communication (section 17), homework (section 19), attendance (section 21) and, for phase 3, sections 36, 37 and 41.

Acceptance: automated tests prove that a student account cannot reach any fee, payment or restricted data, any other student's data, or anything before it is released; results appear for the student at the same moment as for the parent; an idle student session on a shared computer ends on time; a student who was signed out when an announcement was sent sees it, marked unread, at next sign-in; switching from a student session to the parent account on the same phone requires the parent to sign in again; withdrawing consent disables the account within one minute; a 2 MB photo submission completes within 60 seconds on a 2 GB Android phone on a throttled 3G connection; every homework thread is visible to the safeguarding lead.

## 44. Part 2 definition of done

Each optional module is done only when it meets every item in section 34 and also:

- [ ] It can be switched on and off per school, and is hidden when off.
- [ ] Its data appears in the school's full data export (section 23).
- [ ] Its tables are covered by the tenant-isolation and permissions tests.
- [ ] It changed no core table or service without my approval.
- [ ] Its help-centre guide is written.
