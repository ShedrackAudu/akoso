# Spike 01: Row-level security and `withTenant()`

- **Status:** Approved (founder, 11/11/2026). Driver: `pg` (D-6)
- **Module:** `tenancy`, `packages/db` · **Brief:** sections 7, 27, 28.3, 28.4 · **Stage:** 1
- **Estimate:** 8 hours of agent time, plus your review (recorded in `docs/velocity.md`)
- **Settles:** risk R16 (connection pooling) and decision D-OPEN-5 (platform-wide reads).
  Informs R12 and R20.

## Why a spike first

Tenant isolation is the top risk in the brief, and every later table depends on the
pattern chosen here. A spike tries the pattern against a real Postgres and a real
connection pooler before any product table exists, so a wrong assumption costs hours,
not a rewrite.

## User story

As the founder, I want proof that one school can never read or change another school's
data, even when connections are shared, so that I can trust every table built after this.

## What the spike builds

All of it on branch `spike/01-rls-with-tenant`, against local Docker services.

1. **Local pooler.** Add PgBouncer in **transaction pooling** mode to `docker-compose.yml`
   in front of Postgres 16, because managed Postgres in production almost always pools
   this way, and it is the mode that breaks careless tenant settings.
2. **Three database roles,** created by a setup script:
   - `akoso_migrator`: owns the tables and runs migrations.
   - `akoso_app`: the role the web app and worker use. `NOSUPERUSER`, `NOBYPASSRLS`,
     only `SELECT, INSERT, UPDATE, DELETE` on tenant tables.
   - `akoso_platform_reader`: read-only, for option (b) of D-OPEN-5 only.
3. **Two throwaway tables** shaped like real ones: `spike_students` (an ordinary tenant
   table) and `spike_payments` (append-only: `UPDATE` and `DELETE` revoked from the app
   role). Each has `tenant_id uuid NOT NULL` first in its indexes, RLS **enabled and
   forced**, and one policy with both `USING` and `WITH CHECK`:
   `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`.
   (`nullif` matters: an unset setting can read back as an empty string, which would
   otherwise raise a cast error instead of returning no rows.)
4. **`withTenant(tenantId, work)`** in `packages/db/src/with-tenant.ts`: opens a
   transaction, runs `set_config('app.tenant_id', $1, true)`, then runs `work(tx)`. It
   rejects a tenant ID that is not a UUID before touching the database. It is the only
   exported way to get a transaction.
5. **The isolation test**, the real deliverable. It reads the database catalogue, so a
   table added later cannot escape it. For every table with a `tenant_id` column:
   - RLS is enabled **and forced**, and a policy covers all four commands with both
     clauses;
   - with tenant A set, a query returns none of tenant B's rows, and inserting, updating
     or deleting a tenant B row fails or affects nothing;
   - with no tenant set, every query returns nothing;
   - the app role cannot `SET ROLE`, disable RLS or read through a view that skips it.
6. **The pooler test:** two tenants run interleaved transactions over a pool smaller
   than the number of callers, so connections are reused between tenants, and each
   still sees only its own rows. Also: a query run outside `withTenant()` sees nothing,
   even on a connection a moment ago used for tenant A.
7. **D-OPEN-5:** build the smallest version of option (a), a platform table filled by a
   tenant-scoped job, and of option (b), a narrow view read by `akoso_platform_reader`,
   and write down which is safer and simpler.
8. **Query plan check:** `EXPLAIN` on a tenant-filtered query shows the `tenant_id`
   index in use with the policy applied.

## What it does not build

No product tables, no migrations framework beyond what the spike needs, no auth, no
API, no UI. Spike tables are prefixed `spike_` and dropped before anything merges.

## What is kept

- `withTenant()`, the role set-up and the catalogue-driven isolation test become real
  code, through their own pull request after you have read the result.
- `docs/spikes/01-rls-with-tenant.md`: the written result, with the answers to the
  questions below and the evidence (test output and query plans).
- Updates to `docs/risks.md` (R16), `docs/decisions.md` (D-OPEN-5),
  `ARCHITECTURE-ESSENTIALS.md` and `AGENTS.md` if the pattern changes.

## Questions the spike answers

1. Does a transaction-scoped `set_config` survive Drizzle with the chosen driver behind
   PgBouncer in transaction mode, with no leak between tenants?
2. With no tenant set, do all queries return nothing, and never error in a way that
   tempts someone to work around it?
3. Can the app role escape RLS by any route we can think of (owner bypass, `SET ROLE`,
   views, functions, `COPY`)?
4. Does forcing RLS stop the table owner as well, so a mistake in the migrator's
   connection cannot leak data?
5. Is the cost of the policy visible in the query plan?
6. Which D-OPEN-5 option should platform-wide screens use?

## Permissions

No product roles or actions change. Database roles are defined above.

## Threat model (STRIDE)

| Threat                 | Example                                                      | Mitigation tested in the spike                                                                                                |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Code passes another school's ID to `withTenant()`            | Out of scope here: the tenant comes from the verified membership in auth (Stage 1 auth spec). The spike rejects malformed IDs |
| Tampering              | The app updates or deletes an append-only payment row        | `UPDATE` and `DELETE` revoked from the app role; tested                                                                       |
| Tampering              | Inserting a row stamped with another school's `tenant_id`    | `WITH CHECK` rejects it; tested                                                                                               |
| Repudiation            | Cross-tenant attempts leave no trace                         | Out of scope: the audit log has its own spec                                                                                  |
| Information disclosure | Tenant setting leaks to the next user of a pooled connection | Transaction-scoped setting; pooler test with reused connections                                                               |
| Information disclosure | A query runs with no tenant set                              | Policy returns no rows; tested on every table                                                                                 |
| Information disclosure | A new table is added without RLS                             | Catalogue-driven test fails the build                                                                                         |
| Information disclosure | Platform screens read across schools                         | Settled by D-OPEN-5, never by disabling RLS in app code                                                                       |
| Denial of service      | The policy makes every query slow                            | Index led by `tenant_id`; query plan checked                                                                                  |
| Elevation of privilege | The app role turns RLS off or switches role                  | Role has no ownership, no `BYPASSRLS`, no other role grants; tested                                                           |

## Acceptance criteria

- The isolation test passes on both spike tables and fails if RLS is removed from
  either (proven by trying).
- The pooler test passes with connections demonstrably reused between tenants.
- Every question above has a written answer with evidence in `docs/spikes/`.
- `pnpm check` and CI pass.

## Needs from you before code

1. **Approve this spec.**
2. **One new runtime dependency choice** (yours under section 3.3). Drizzle is in the
   brief's stack, but it needs a Postgres driver, which the brief does not name:
   - **`pg` (node-postgres) 8.23** — _recommended._ The long-established driver, the
     one Drizzle's own documentation leads with, and it works with PgBouncer in
     transaction mode without special settings.
   - `postgres` (postgres.js) 4.1 — faster in benchmarks, but uses prepared statements
     by default, which need extra care behind a transaction pooler.
     The spike also adds `drizzle-orm` 0.45 (runtime, in the brief), and `drizzle-kit`
     and `@types/pg` (development only).
3. **Start Docker Desktop.** It was not running, and the spike needs Postgres and
   PgBouncer.

## Open questions

- Which PgBouncer container image to use. There is no official one; I will pick a
  maintained image, pin it to an exact version, and name it in the result.
