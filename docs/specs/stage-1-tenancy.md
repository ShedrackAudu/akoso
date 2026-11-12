# Tenancy: schools, groups, addresses and the isolation suite

- **Status:** Built (12/11/2026). Approved (founder, 12/11/2026), with all four recommendations: a branch is a school in a group, groups are optional, the school travels in the address, and the paused message names the school office
- **Module:** `tenancy` (`packages/core/src/tenancy`, `packages/db/src/schema/tenancy.ts`, `packages/schemas/src/tenancy.ts`), `apps/web` (the request proxy) · **Brief:** sections 7, 7.1 (routing only), 27 · **Stage:** 1, item 4
- **Estimate:** 16 hours of agent time
- **No new dependencies.**

## Why now

Everything after this stores data for a school. Before the first school table exists,
three things need to be settled:

- what a school (tenant) and a group are
- how a request is matched to a school, on the app address and on a school's own
  address
- a test that **every** tenant table, now and later, proves one school cannot read or
  change another's rows

That test is part of the Stage 1 checkpoint ("tenant-isolation tests pass on every
table").

## User stories

- As a parent with children in two schools, I want one app, one install and one sign-in,
  and to switch between the schools without signing in again.
- As a proprietor, I want my school's own address (`greenfield.akoso.ng`) to show my
  school's name and a way to sign in, and never another school's.
- As the founder, I want a build that fails the moment any table could leak one school's
  data to another.

## What it does

### 1. Schools and groups

- **A school is a tenant.** Each school using Akoso is one row in `platform.tenants`,
  and every school-owned row elsewhere carries its `tenant_id`.
- **A group sits above schools.** It lets one owner run several branches (brief 7). A
  **branch is simply a school in a group** (glossary), so there is no separate
  `branches` table (open question 1).
- A school's group is optional. Most schools stand alone; the group screens come later
  (brief 23), but the link exists from day one.
- **School status** controls what the app allows:

| Status       | Meaning                                            | Effect on requests for that school                                                                                                            |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding` | Created, being set up                              | Normal (setup screens)                                                                                                                        |
| `active`     | In use                                             | Normal                                                                                                                                        |
| `suspended`  | Paused by Akoso (e.g. unpaid platform fee, abuse)  | Every request refused with a calm message; public pages show "temporarily unavailable"                                                        |
| `read_only`  | Leaving (brief 26.7, "read-only for a set period") | Reads allowed; every write refused                                                                                                            |
| `closed`     | Gone; data kept only for the retention period      | Every request refused; members are told "This school's account has closed. Please contact the school office."; the public address returns 404 |

- **The slug** is the school's address name, as in `greenfield` in
  `greenfield.akoso.ng`.
  - It is lower-case letters, digits and single hyphens, 3 to 40 characters, unique,
    and set when the school is created.
  - A reserved list blocks the names Akoso itself needs: `app`, `admin`, `api`, `www`,
    `custom`, `staging`, `status`, `mail`, `help`, `support`, `demo`, `docs`, `assets`
    and similar.
  - Changing a slug later is a platform-admin action (out of scope here). The old one
    then redirects for a while.
- Each school stores its **time zone**, defaulting to `Africa/Lagos`. Item 6 uses it for
  every "today" and deadline.

Creating, suspending and closing schools are platform-admin screens (Stage 5). For now,
schools are created by the seed script (section 6).

### 2. One app address, the school in the path

The signed-in app lives at `app.{domain}` only (brief 7). After sign-in the person
chooses a school, and **the chosen school travels in the address**:

```
app.akoso.ng/greenfield/fees        ← Greenfield, the fees screen
app.akoso.ng/st-annes/fees          ← St Anne's, in another tab, same sign-in
```

Why the address rather than a cookie (open question 3):

- **Two tabs, two schools:** a parent can have both open at once without one silently
  switching the other.
- **Links and bookmarks** keep the right school.
- **Server actions** carry the school from the route, so nothing extra has to be sent.

**Every request** with a school in it checks that school against the user's memberships
before anything runs:

- Pages and server actions take it from the path.
- `/api/v1` calls from the mobile app send it in the `X-Akoso-School` header, as already
  built.

A school the user doesn't belong to answers **404**, the same as one that doesn't exist.
Memberships themselves arrive with sign-in (item 5); this item builds the check's
interface and the rule.

### 3. School addresses (public pages)

`{slug}.{domain}` and, later, a school's custom domain serve **public** pages only:

- the school's name
- a **Sign in** button that opens `app.{domain}/{slug}/sign-in`
- later, the admissions form and document and receipt verification

For now there is one page: the school's name and the sign-in button.

### 4. The request proxy (`apps/web/proxy.ts`)

Next.js's request proxy runs before every page and route. It does four things.

1. **Checks the Host header against known hosts.**
   - `app.{domain}` is allowed.
   - `{slug}.{domain}` is allowed only for a known school that is not closed.
   - An active custom domain from `platform.tenant_domains` is allowed.
   - Locally, the same names under `akoso.localhost` are allowed.
   - **Any other host gets 404, never a default school.**
2. **Sends school addresses to the public pages.** A request to
   `greenfield.akoso.ng/` is served by the public page for Greenfield. Every app route,
   `/api/v1` included, answers 404 on a school address.
3. **Keeps cookies off school addresses and custom domains.** The proxy drops any
   incoming `Cookie` header there, and the public school pages never set one; a test
   checks that no `Set-Cookie` comes back. (A proxy cannot strip cookies a page sets
   after it runs, so the rule is enforced at both ends instead.) Sign-in cookies live
   on `app.{domain}` only.
4. **Looks up schools without exposing the table.**
   - The app role cannot read `platform.tenants` directly. It calls two small
     `SECURITY DEFINER` functions: by slug, and by custom host.
   - Each returns only the school's ID, slug, name, status and time zone.
   - Found schools and misses are kept apart, so made-up addresses can never push a real
     school out; identical lookups in flight share one query; and database lookups not
     answered from memory are capped at 50 a second per instance (over the cap the answer
     is 404). Added after the cross-model review (D-22).
   - Answers are cached in memory for 60 seconds per web instance, so most requests
     need no database call. A status change takes effect within a minute.

### 5. Every tenant table, proven isolated

A single test suite, `pnpm test:db`, inspects the database itself rather than a
hand-kept list. It finds **every table with a `tenant_id` column** in the application
schemas and fails unless each one has all of these:

| Check                                                                                                         | How                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| RLS enabled **and forced**                                                                                    | `pg_class.relrowsecurity` and `relforcerowsecurity`                           |
| A policy with both `USING` and `WITH CHECK` on `tenant_id`                                                    | `pg_policy`                                                                   |
| `tenant_id` first in every multi-column index and unique constraint                                           | `pg_index`                                                                    |
| `tenant_id` references `platform.tenants`                                                                     | a foreign key, so no row can belong to a school that doesn't exist            |
| A **fixture**, a way to make a valid row for a given school                                                   | registered beside the table's schema; a new table without one fails the suite |
| School B cannot **read, insert, update or delete** school A's rows, and with no school set nothing is visible | run for every table using its fixture, as the app role through PgBouncer      |

The suite runs on every pull request (it is already a required check). Spike-only
tables, those prefixed `spike_` or in the `spike_paystack` schema, are skipped; they
never reach a migration.

`platform.idempotency_keys` (item 3) is the first table the suite covers. It gains a
foreign key to `platform.tenants`.

### 6. Seed data

`pnpm db:seed` creates clearly fake data for local development and tests. It is
re-runnable, and it refuses to run when `NODE_ENV=production`.

| Seeded                | Details                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Group                 | "Bright Futures Schools"                                                                     |
| Schools in that group | **Greenfield Academy** (`greenfield`, active) and **St Anne's College** (`st-annes`, active) |
| Standalone schools    | A `suspended` one and a `read_only` one, for tests                                           |

The isolation tests use their own two schools with fixed IDs.

## Data changes

All new tables live in the `platform` schema. Groups and schools describe schools rather
than belonging to one, so they have no RLS by school; access is limited by grants
instead. A school's domains belong to that school, so `tenant_domains` is a tenant table.

| Table                     | Columns (besides `created_at`, `updated_at`, `created_by`)                                                                                                                                  | App role access                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform.groups`         | `id`, `name`                                                                                                                                                                                | None (the admin app, later)                                                                                                                                          |
| `platform.tenants`        | `id`, `group_id` (nullable), `slug` (unique, checked), `name`, `status` (checked), `time_zone`, `status_changed_at`                                                                         | Only through `platform.tenant_by_slug(slug)` and `platform.tenant_by_host(host)`                                                                                     |
| `platform.tenant_domains` | `id`, `tenant_id`, `hostname` (unique, lower-case), `status` (`pending_dns`, `verifying`, `active`, `failing`, `removed`), `verification_token_hash`, `token_expires_at`, `last_checked_at` | A tenant table (the school will manage its own domains): RLS forced, the app role may read its own school's rows; routing reads active rows through `tenant_by_host` |

Other changes:

- **`platform.idempotency_keys`** gains a foreign key on `tenant_id`.
- **`created_by`:**
  - The brief asks for it on every table (27).
  - It holds a user ID once users exist (item 5); until then it is nullable, and seeds
    leave it empty.
  - It becomes `NOT NULL` with sign-in, as an expand-then-contract migration.
- **Retention:** schools and groups are kept for the life of the school's agreement,
  then deleted or pseudonymised as brief 26.7 describes. That procedure belongs to the
  "school leaves" slice; the retention policy document records it.
- **Migrations:** the generated table DDL comes from Drizzle. Grants, checks and the two
  lookup functions go in a hand-written migration, as in item 3.

## Permissions

No school-facing actions yet. In the request pipeline:

- **Suspended or closed school:** refused with a `403` saying the school's account is
  paused, with no details.
- **Read-only school:** writes are refused with a `409` saying the school's account is
  read-only.

Platform-admin actions on schools (create, suspend, close) are specified with the admin
app.

## API and jobs

- **Core (`packages/core/src/tenancy`):**
  - `findSchoolBySlug`, `findSchoolByHost`, the cached resolver, `assertSchoolAllows`
    (applies the status rules), and slug validation with the reserved list.
- **Kernel:**
  - `RequestContext` gains `school: { id, slug, status, timeZone } | null`, alongside
    `tenantId`.
  - `handleRequest` and `runServerAction` refuse requests for suspended, closed or
    read-only schools as above.
- **No new `/api/v1` endpoints.** The school list for the picker comes with sign-in
  (`GET /api/v1/me/schools`, item 5).
- **No jobs yet.** Custom-domain checks are a worker job in the custom-domains slice.

## Edge cases

- **Unknown, mistyped or IP hosts:** 404, never a default school.
- **A spoofed `X-Forwarded-Host`:** ignored. Only `Host` counts, and Render sets it.
- **A slug that differs only in case** (`Greenfield`): addresses are lower-cased before
  lookup, and slugs are stored lower-case.
- **A school suspended mid-session:** within a minute (the cache lifetime) every request
  is refused. Item 5 can clear the cache on sign-in checks if a minute is too long.
- **A custom domain whose DNS breaks:** the school's subdomain keeps working. The
  routing reads only `active` rows.
- **Two tabs on two schools:** each request carries its own school, so neither tab
  affects the other.
- **A row inserted with no school set:** RLS refuses it, and the suite proves it.

## Threat model (STRIDE)

| Threat                     | Example                                                                                                                 | Mitigation                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A request claims another school by editing the address, the header or a form field                                      | The school is always checked against the user's memberships, from the session, on every request. A non-member gets 404                                                                      |
| **Tampering**              | A body carries `tenant_id` for another school                                                                           | Strict input rejects unknown fields; `tenant_id` comes only from the checked context; RLS `WITH CHECK` refuses a mismatched row anyway                                                      |
| **Repudiation**            | A school's status changes and nobody knows who changed it                                                               | `status_changed_at` plus the audit log (item 6); status changes are admin-only                                                                                                              |
| **Information disclosure** | Enumerating schools by trying slugs or IDs; reading another school's rows; a cookie leaking to a school's custom domain | Lookups return only public fields. 404 is the same for "missing" and "not yours". RLS is forced on every tenant table, proven by the suite. Cookies are stripped on school and custom hosts |
| **Denial of service**      | Flooding random hosts to force database lookups                                                                         | Hosts are validated by pattern first, misses are cached briefly too, and public routes are rate-limited by IP (item 3)                                                                      |
| **Elevation of privilege** | The app role lists every school, or writes to `platform.tenants`                                                        | No direct grant on the tenancy tables; only two read-only lookup functions with a fixed `search_path`                                                                                       |

## Acceptance criteria

1. **Migrations:** `platform.groups`, `platform.tenants` and `platform.tenant_domains`
   exist via migrations, with checks on slug, status and hostname. The app role can't
   select from them directly, and the lookup functions return only the public fields.
2. **The isolation suite** discovers every `tenant_id` table and fails for each missing
   protection. It is proven by planting a table without forced RLS (the test fails)
   and then removing it, like the R2 guard in spike 04.
3. **Suite coverage:** `platform.idempotency_keys` passes the full suite, including the
   cross-school read, insert, update and delete attempts.
4. **The proxy:**
   - unknown host → 404
   - `app.akoso.localhost` → the app
   - `greenfield.akoso.localhost` → Greenfield's public page
   - `/api/v1/health` on a school host → 404
   - a school host receives no cookies and returns no `Set-Cookie`

   Proven by end-to-end tests.

5. **School status in the pipeline:** suspended, closed and read-only schools are
   refused as described, with Problem Details (database tests with seeded schools).
6. **Slugs:** validation rejects reserved and malformed slugs (unit tests).
7. **Seeding:** `pnpm db:seed` is re-runnable and refuses to run in production.
8. **Docs:** `ARCHITECTURE.md` section 5, `ARCHITECTURE-ESSENTIALS.md` and the tenancy
   module README describe what was built.

## Out of scope

- **Memberships, users and the school picker:** sign-in, item 5. The membership check's
  interface is here; its data comes then.
- **Custom domains:** adding, verifying, certificates and the Cloudflare `DomainProvider`.
  That's the custom-domains slice; here only routing reads active domains.
- **School management screens:** platform admin, Stage 5.
- **File keys prefixed by tenant:** the file-storage slice.

## Open questions

1. **Branch = school.** The brief's table list (27) names `branches`, but the glossary
   says a branch is a school in a group. I recommend no `branches` table: a branch is a
   `tenant` with a `group_id`. Say so if a branch means something else to you, such as
   two campuses sharing one school's records.
2. **Groups optional.** I recommend a standalone school has no group (`group_id` empty),
   rather than every school being given a group of one.
3. **The school in the address** (`app.akoso.ng/greenfield/...`) rather than a cookie.
   I recommend the address, for the two-tabs and bookmarks reasons in section 2.
4. **The suspended-school message** shown to staff and parents: "This school's account
   is paused. Please contact the school office." I recommend this wording; you may
   prefer to name Akoso support for staff.
