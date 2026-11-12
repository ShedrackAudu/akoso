# Akoso: Architecture Essentials

Read this at the start of every session. Details: `docs/ARCHITECTURE.md`. Rules for
agents: `AGENTS.md`. Then load only the brief sections for your task from `docs/brief/`.

## Stack

TypeScript strict · Next.js App Router · pnpm workspaces · PostgreSQL 16 with RLS ·
Drizzle · Zod · Better Auth · pg-boss · Gotenberg · S3-compatible storage · Tailwind and
shadcn/ui (preset `b4bg87xLw8`, Base UI, Phosphor icons) · Serwist and Dexie for offline.

## Folder map

```
apps/web        app.<domain>: PWA for parents and staff, school screens, /api/v1, school public pages
apps/admin      admin.<domain>: platform admin for the Akoso team
apps/worker     background jobs (pg-boss)
apps/mobile     Expo foundation, Stage 7 (README only)
packages/core       use cases, one folder per module, public interface in index.ts
packages/domain     pure logic: results, fees, payroll. No I/O
packages/db         Drizzle schema (schema/<module>.ts), migrations, RLS, withTenant()
packages/schemas    shared Zod schemas (<module>.ts)
packages/providers  interfaces + fake adapters for every external service
packages/api-client typed /api/v1 client (generated)
packages/ui         components/ = shadcn (generated) · akoso/ = ours
docs/brief          the brief, one file per section
```

Dependencies point one way: **apps → core → domain, db, providers → schemas**.
`pnpm boundaries` fails on a violation.

## Non-negotiable rules

1. **Tenant safety.** Every database access goes through `withTenant(tx, tenantId)`.
   Never a plain `SET`. Never bypass RLS. Every tenant table has `tenant_id` first in its
   indexes and RLS enabled and forced.
2. **Money is integer kobo.** Never floating point. Payments are never edited or deleted.
3. **Results come from snapshots.** Published report cards render only from the
   immutable snapshot written at approval.
4. **The server decides.** Permissions, totals, grades, balances, prices, roles and
   tenant are checked or recomputed on the server. Hiding a button is not access control.
5. **No business logic in UI.** Server actions and route handlers are thin wrappers over
   `packages/core`. Pure computation lives in `packages/domain`.
6. **Modules keep to themselves.** Import another module only through its `index.ts`.
   Use only your own module's tables.
7. **External services go through `packages/providers`.** Never call a provider SDK from
   business logic.
8. **Heavy work runs in the worker** as idempotent, retryable jobs. Never render a PDF
   or send a broadcast in a web request.
9. **Time.** Store moments as `timestamptz` in UTC and date-only values as dates.
   Compute every "today" and deadline in the school's time zone. Never trust a phone's clock.
10. **Nothing is hard-coded** that the brief calls data: plans, prices, tax tables,
    schemes, subjects, limits, provider fees, the base domain.
11. **Never weaken a test, an RLS policy or a security check** to make a build pass.
12. **Ask, don't guess,** on any Nigerian school convention the brief does not state.

## Naming

- Use the school's words: `scoreSheet`, `classArm`, `bursar`, `billingAccount`, `term`,
  `session` (a school year; a login is a "login session"). Glossary: `docs/glossary.md`.
- In code a school is a **tenant**. To parents, a dedicated account is the **"fees account"**.
- Files and folders: `kebab-case`. Types and components: `PascalCase`. Functions and
  variables: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`. Tables and columns: `snake_case`.
- Branded types for IDs and money: `StudentId`, `TenantId`, `InvoiceId`, `Kobo`.
- No abbreviations a new developer would have to guess.
- User-facing text follows `docs/brand-voice.md`: calm, plain numbers, the child's name,
  no exclamation marks, no emojis.

## Standard patterns

These show the intended shape. Each is confirmed, and this file updated, by the first
slice that uses it.

**Service (use case)** in `packages/core/src/<module>/`: takes an authenticated context,
checks permission, then works inside `withTenant()`.

```ts
export async function getFamilyBalance(
  ctx: AuthContext,
  input: GetFamilyBalanceInput
): Promise<FamilyBalance> {
  authorize(ctx, "fees.statement.read", { familyId: input.familyId })
  return withTenant(ctx.db, ctx.tenantId, (tx) =>
    readFamilyBalance(tx, input.familyId)
  )
}
```

**API handler and server action:** a thin wrapper. Parse with the Zod schema, call the
service, return the output schema's shape.

```ts
export const POST = apiHandler(submitScoreSheetInput, (ctx, input) =>
  submitScoreSheet(ctx, input)
)
```

**Pure domain function** in `packages/domain`: no I/O; expected failures return a result.

```ts
export function allocatePayment(
  amount: Kobo,
  lines: OpenLine[]
): Result<Allocation, AllocationError>
```

**Form:** React Hook Form with the same Zod schema the server uses.

**Background job:** idempotent, keyed, retryable; calls a service.

```ts
defineJob("receipt.send", receiptSendPayload, async (ctx, payload) =>
  sendReceipt(ctx, payload)
)
```

**Errors:** throw `ValidationError`, `NotFoundError`, `ForbiddenError` or
`ConflictError`; one mapper turns them into API responses and friendly messages.

**Icons:** Phosphor only, through `Icon` from `@akoso/ui/akoso/icon`
(`<Icon icon={HouseIcon} filled={isActive} />`). Outline by default, filled for active
states, status and small sizes.

**Components:** add shadcn components with the CLI or MCP tools, never by pasting code.

## Commands

```
pnpm install                 install (pnpm via corepack; Node 24)
docker compose up -d         Postgres (5433), PgBouncer (6432), Gotenberg
pnpm dev                     web app on http://localhost:3000
pnpm dev:admin               platform admin on http://localhost:3001
pnpm check                   everything CI runs except the build and database tests
pnpm test:db                 database and tenant-isolation tests (needs Docker)
pnpm test:e2e                browser tests with Playwright (needs Docker)
pnpm --filter @akoso/worker build   bundle the worker with esbuild
pnpm typecheck | lint | test | boundaries | unused | format:check
pnpm build                   build every app
pnpm brief:split             regenerate docs/brief/ after the master prompt changes
```

A slice is done only when `pnpm check` and `pnpm build` pass and the definition of done
(brief section 34) is met.
