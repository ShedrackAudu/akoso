# Service layer and `/api/v1` conventions

- **Status:** Built (12/11/2026). Approved by the founder on 12/11/2026 with the three recommendations in the open questions
- **Module:** `packages/core` (context, errors, permissions check, logging), `packages/schemas` (contracts), `packages/api-client`, `apps/web` (HTTP and server-action wrappers) · **Brief:** sections 5.1, 3.1, 28, 28.1 (OWASP API Top 10), 30 · **Stage:** 1, item 3
- **Estimate:** 14 hours of agent time
- **No new dependencies.** Zod 4 already turns schemas into JSON Schema, which is all the OpenAPI document needs. The typed client is a thin wrapper over `fetch`, so no code generator is added.

## Why now

Every later feature is a use case behind a server action, an `/api/v1` route, a
background job or all three. If each one parses input, checks permissions, reports
errors and logs in its own way, the mobile app (Stage 7) and the security review inherit
twenty different ways of doing it. This item fixes the **one way** (`ARCHITECTURE.md`
section 4.3), before tenancy and sign-in are built on it.

## User story

As a developer building any Akoso feature, I want one obvious way to write a use case
and expose it to the web app, the API and the worker, so that permissions, validation,
errors, logging and idempotency are right without my having to remember them.

## What it does

### 1. The use case (`packages/core`)

Every use case is a plain async function in `packages/core/src/<module>/` taking a
**context** and a validated input. It is the only place business logic lives.

```ts
export async function listMyClasses(
  ctx: RequestContext,
  input: ListMyClassesInput
): Promise<Page<ClassSummary>> {
  authorize(ctx, "learning.class.list_own")
  return withTenant(ctx.db, ctx.tenantId, (tx) =>
    readClassesForTeacher(tx, ctx.actor.userId, input)
  )
}
```

**The context** (`packages/core/src/context/`) is built once per request or job, never
by the use case:

| Field       | What it holds                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestId` | A new random ID for every request. It follows the request into logs and into any job it queues. A client-sent `X-Request-Id` is logged alongside it, never trusted in its place                                        |
| `actor`     | `{ kind: "user", userId, roles, permissions }` or `{ kind: "system", job }` for the worker. Anonymous callers have no context; public endpoints use a separate, smaller `PublicContext`                                |
| `tenantId`  | The school chosen for this request. It has been **checked against the user's memberships** before the context exists (brief 5.1: "the server verifies membership on every request"). Absent for platform-level actions |
| `db`        | The database handle. Tenant data is reached only through `withTenant(ctx.db, ctx.tenantId, ...)`                                                                                                                       |
| `now()`     | The server's clock, so tests can fix time (brief 3.1: never trust a phone's clock)                                                                                                                                     |
| `log`       | A logger already carrying `requestId`, `tenantId` and `userId`                                                                                                                                                         |

**Building a real context needs sign-in (item 5).** Until then:

- Every route that needs a signed-in user answers `401`.
- Tests build contexts with a `testContext()` helper that exists only in test code.
- No fake sign-in is ever added to production code.

**Permission check.** `authorize(ctx, actionKey, scope?)` is the one central check. It
reads the action keys from a typed list that mirrors `docs/permissions.md`. It throws
`ForbiddenError` when the actor lacks the permission. Until roles exist (item 5), every
check denies. Each slice adds its keys to `docs/permissions.md` in its spec, for your
approval.

### 2. Contracts (`packages/schemas`)

Each endpoint is declared once, as a **contract** in
`packages/schemas/src/contracts/<module>.ts`:

```ts
export const listMyClasses = defineContract({
  method: "GET",
  path: "/api/v1/me/classes",
  summary: "The classes and subjects the signed-in teacher teaches",
  input: listMyClassesInput, // query string for GET, JSON body otherwise
  output: page(classSummary),
  permission: "learning.class.list_own",
  rateLimit: "standard",
})
```

The same contract drives three things:

1. The route handler.
2. The generated **OpenAPI 3.1** document.
3. The typed client in `packages/api-client`.

The input, output, path and method therefore cannot drift between server, documentation
and mobile app. Contracts use only Zod, so they also run in React Native.

**Output schemas are explicit and strict.** The handler parses the use case's result
through the output schema before sending it, dropping any field not declared. A whole
database row can never leak by accident (OWASP API3, "excessive data exposure").

### 3. The route handler (`apps/web`)

```ts
// apps/web/app/api/v1/me/classes/route.ts
export const GET = apiRoute(contracts.listMyClasses, listMyClasses)
```

`apiRoute` does every step, in this order:

| Step               | Detail                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request ID         | Created and returned in the `X-Request-Id` response header                                                                                                                              |
| Sign-in and school | Builds the context from the session (item 5) and the `X-Akoso-School` header. Missing sign-in → `401`; not a member of that school → `404`, so other schools' existence is not revealed |
| Size and type      | JSON only, body at most 1 MB (smaller per contract where sensible) → otherwise `413` or `415`                                                                                           |
| Rate limit         | Per user, per IP and per school (section 6 below) → `429` with `Retry-After`                                                                                                            |
| Input              | Query string or JSON body parsed by the contract's input schema. Unknown fields are **rejected**, not ignored (mass assignment, brief 28) → `422` with field errors                     |
| Idempotency        | Writes require an `Idempotency-Key` header (section 5 below)                                                                                                                            |
| Use case           | Called with the context and the parsed input                                                                                                                                            |
| Output             | Parsed by the output schema; a mismatch is a server error, logged, never sent                                                                                                           |
| Errors             | Mapped by the one error mapper (section 4)                                                                                                                                              |
| Log                | One structured line per request (section 7)                                                                                                                                             |
| Headers            | `Cache-Control: no-store` on every authenticated response                                                                                                                               |

**Cookies and cross-site requests.** The web app signs in with a cookie. Writes to
`/api/v1` using a cookie must come from Akoso's own origin (`Origin` checked against
`APP_BASE_DOMAIN`), or they are refused. The mobile app sends a bearer token instead
(item 5), which a browser never sends by itself.

### 4. Errors, one format

Use cases throw a small set of typed errors. Pure `packages/domain` code returns
`Result` values for expected failures, and the use case turns them into these errors.

| Error                  | HTTP | When                                                                                   |
| ---------------------- | ---- | -------------------------------------------------------------------------------------- |
| `ValidationError`      | 422  | Input breaks a rule. Carries field paths and messages                                  |
| `UnauthenticatedError` | 401  | Not signed in, or the session expired                                                  |
| `ForbiddenError`       | 403  | Signed in, but not allowed                                                             |
| `NotFoundError`        | 404  | Missing, **or** belongs to another school or family: the same answer either way        |
| `ConflictError`        | 409  | State changed underneath, e.g. a sheet already approved, or an edit on a stale version |
| `RateLimitedError`     | 429  | Too many requests                                                                      |
| anything else          | 500  | A bug. Logged with the request ID; the response says only that something went wrong    |

Every error response uses the standard **Problem Details** format (RFC 9457), with
Akoso's fields added:

```json
{
  "type": "https://akoso.ng/errors/validation",
  "title": "Some details need checking",
  "status": 422,
  "code": "validation",
  "requestId": "req_01J...",
  "errors": [{ "path": "scores.3.value", "message": "Must be 40 or less" }]
}
```

- **Titles and messages follow `docs/brand-voice.md`:** calm and plain, with no stack
  traces, SQL or internal names (brief 28.4 item 20).
- **Server actions** return the same shape as a value (`{ ok: false, error }`), so forms
  show field errors next to the right fields.

### 5. Writes are idempotent

A phone on a weak connection retries. A retried "submit score sheet" or "record cash
payment" must not happen twice.

- Every `/api/v1` write (`POST`, `PUT`, `PATCH`, `DELETE`) needs an `Idempotency-Key`
  header, a client-made random ID. A write without one gets `400`.
- The key, a hash of the request and the stored response are kept for **24 hours**, in
  a tenant table (`platform.idempotency_keys`) under RLS like every other tenant table.
  - **Same key, same request:** the stored response is returned, and the use case does
    not run again.
  - **Same key, different request:** `422`.
  - **The first attempt is still running:** `409`.
- Server actions that create money or results records take the same key from a hidden
  form field. The offline queue already sends one per operation (spike 02).
- Webhooks and jobs keep their own idempotency (event IDs, job keys); this does not
  replace those.

### 6. Rate limits

- **Where counts are kept:** in Postgres, in a small unlogged table of fixed one-minute
  windows, keyed by user, IP and school. There is no new service, and the counts are
  shared by every web instance.
- **Upgrade path:** if this becomes a bottleneck, the store can move to Render Key Value
  ($10 a month) behind the same interface.
- **Limit classes:** each contract names one, such as `standard`, `write`, `export` or
  `public`.
  - The numbers live in one config file for now, and are tuned from staging and pilot
    traffic.
  - Brief rule 10 treats limits as data, so they move to the platform admin with
    feature flags.
- **Sign-in and OTP limits** (per phone number, IP and school, with lockout) belong to
  the auth spec (item 5), which uses this same mechanism.
- **Later:** Cloudflare adds an outer limit once the domain is on it.

### 7. Pagination, versions, logs

- **Pagination:** cursor-based for every list.
  - Request: `?limit=` (default 25, at most 100) and `?cursor=`.
  - Response: `{ "data": [...], "nextCursor": "..." | null }`.
  - The cursor is opaque base64 text holding the sort position, and it is validated
    when it comes back.
  - Offsets are never used: they slow down and skip rows as data changes.
- **Versions:** `/api/v1` only grows. Fields and endpoints may be added. Anything that
  would break the mobile app (removing or renaming a field, tightening an input) goes to
  `/api/v2`.
  - A CI check compares the generated OpenAPI document with the committed one.
  - Unexpected changes fail the build, and removals are flagged for review.
- **Logs:** one JSON line per request or job, with:
  - time, level, `requestId`, `tenantId`, `userId`
  - route or job, status and duration
  - the error code and stack, for 500s only

  Bodies, query strings, tokens, phone numbers and names are **never** logged (brief 28).
  The logger is a small module in `packages/core` with no extra package; Sentry joins it
  later.

### 8. Server actions and jobs

- **Server action:** `serverAction(schema, useCase)`. It does the same steps as
  `apiRoute`, apart from the HTTP-only ones, and returns `{ ok: true, data }` or
  `{ ok: false, error }`.
- **Job:** `defineJob(name, payloadSchema, useCase)` (pg-boss arrives with the worker
  slice). It builds a `system` context carrying the request ID that queued it.

### 9. The client (`packages/api-client`)

```ts
const api = createApiClient({ baseUrl, getToken, schoolId })
const page = await api.listMyClasses({ limit: 25 }) // typed from the contract
```

- Validates responses against the contract's output schema.
- Adds `Idempotency-Key` to writes automatically, keeping it across that call's retries.
- Turns Problem Details into a typed `ApiError`.

The mobile app uses it in Stage 7; the web app's own screens use server actions.

## What is built in this item

1. In `packages/core`:
   - the context types
   - `authorize()` with an empty permission list
   - the errors and the error mapper
   - the logger and `Page`/cursor helpers
   - `testContext()`, test-only
2. `defineContract`, `page()`, the Problem Details schema and the OpenAPI generator, in
   `packages/schemas`. `pnpm api:openapi` writes `packages/api-client/openapi.json`, and
   CI checks it is up to date.
3. `apiRoute`, `publicRoute` and `serverAction` in `apps/web`.
4. `platform.idempotency_keys` and `platform.rate_limit_windows` as Drizzle tables. The
   first goes under RLS, forced, with isolation tests. Both are created by this repository's
   first real migration (spikes used SQL scripts).
5. The typed client in `packages/api-client`.
6. **First endpoint: `GET /api/v1/health`** (public), which proves the handler, request
   IDs, errors, logging and OpenAPI end to end. It returns only `{ "status": "ok" }`: no
   version, host or database details.
7. The patterns in `ARCHITECTURE-ESSENTIALS.md` and `AGENTS.md` are updated from
   "intended shape" to confirmed.

The first signed-in endpoints, `GET /api/v1/me` and `GET /api/v1/me/schools`, arrive
with sign-in (item 5). They confirm the authenticated half on a real use case.

## Data changes

| Table                                                                                                                                  | Tenant                                               | RLS                                                          | Append-only                          | Retention                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ | --------------------------------------- |
| `platform.idempotency_keys` (`tenant_id`, `key`, `user_id`, `request_hash`, `state`, `response_status`, `response_body`, `created_at`) | Yes, `tenant_id` first in the key                    | Enabled and forced, `USING` and `WITH CHECK`                 | No: state moves from running to done | Deleted after 24 hours by a cleanup job |
| `platform.rate_limit_windows` (`bucket`, `window_start`, `count`)                                                                      | No: counts only, no personal data (bucket is a hash) | Not needed: the app role may only call one counting function | No                                   | Windows older than 10 minutes deleted   |

**Personal data.** Stored responses may contain personal data for 24 hours, inside the
school's own RLS boundary. They are never logged.

**Migrations.** Drizzle migrations are introduced here and run by the migration role
only. They follow expand, migrate, contract.

## Permissions

No school-facing actions yet. `authorize()` denies everything until item 5 maps roles to
actions. `docs/permissions.md` gains a short section explaining how action keys are named
(`<module>.<thing>.<verb>`) and where they are checked.

## Edge cases

- **Retries after a timeout:** the client resends the same idempotency key, and gets the
  stored response.
- **Two devices, same key:** keys are scoped to the user and school, so two different
  people can't collide.
- **Large lists:** the cursor keeps pages stable while rows are added.
- **Body too large, wrong content type, malformed JSON:** `413`, `415` or `422`; the
  use case never runs.
- **Clock skew:** only `ctx.now()` is used. Client times are recorded as client times,
  never as the time of record.
- **School switched mid-session:** the school comes with each request and is checked
  each time, so a stale tab can't act on the wrong school.

## Threat model (STRIDE)

| Threat                     | Example                                                                        | Mitigation                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A request claims another school or user                                        | The school header is checked against the user's memberships on every request; the user comes only from the session or token, never the body                     |
| **Tampering**              | A client sends `tenantId`, `role`, `total` or `status` in a body               | Strict input schemas reject unknown fields; tenant and actor come from the context; totals are recomputed (rule 4)                                              |
| **Repudiation**            | "I never submitted that"                                                       | Request IDs on every log line and job; the audit log (item 6) records who did what                                                                              |
| **Information disclosure** | A list returns whole rows; an error leaks SQL; another school's IDs are probed | Strict output schemas; Problem Details without internals; `404` for other schools' records; no-store caching                                                    |
| **Denial of service**      | A script floods writes or huge bodies                                          | Rate limits per user, IP and school; a body size cap; `limit` capped at 100; Cloudflare in front later                                                          |
| **Elevation of privilege** | A route forgets the permission check                                           | Every contract names its permission. The handler refuses to start without one (or an explicit `public: true`), and a test lists every contract and asserts this |

## Acceptance criteria

1. A test module exercises `apiRoute` end to end: `401`, `404` (non-member), `413`,
   `415`, `422` (unknown field and bad value), `429`, `409`, idempotent replay, and
   output-field stripping, each giving the documented Problem Details.
2. `GET /api/v1/health` works in the running app and returns `X-Request-Id`.
3. A test fails if any contract lacks a permission and is not marked public.
4. `pnpm api:openapi` produces a valid OpenAPI 3.1 document. CI fails if the committed
   copy is out of date.
5. The typed client calls `/api/v1/health` in a test and gets a typed result.
6. The isolation suite covers `platform.idempotency_keys`: school A can't read or reuse
   school B's keys.
7. Logs from the tests contain no request bodies, tokens or phone numbers (asserted).
8. `ARCHITECTURE-ESSENTIALS.md`, `AGENTS.md` and `docs/permissions.md` describe the
   confirmed patterns.
9. `pnpm check`, `pnpm test:db`, the Security workflow and the build pass.

## Out of scope

- Sign-in, sessions, roles and real contexts (item 5).
- Tenancy tables, school membership and the single app address (item 4). This item
  defines how the school is checked, not where memberships live.
- The audit log and feature flags (item 6).
- pg-boss itself (the worker slice).
- Security headers (CSP and others), which get their own small item.

## Open questions

1. **Problem Details (RFC 9457)** as the error format: a standard most API clients
   understand. I recommend it; it is within my decision rights, but listed so you see
   it.
2. **Rate-limit counts in Postgres** rather than a paid Render Key Value store ($10 a
   month): I recommend Postgres until load says otherwise.
3. **Idempotency keys required on every `/api/v1` write,** not only money and results:
   stricter, simpler for the mobile app, and what the brief says. I recommend requiring
   them.
