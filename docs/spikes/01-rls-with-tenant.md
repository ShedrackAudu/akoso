# Spike 01 result: row-level security and `withTenant()`

- **Date:** 11/11/2026 · **Spec:** [stage-1-spike-01-rls-with-tenant](../specs/stage-1-spike-01-rls-with-tenant.md)
- **Branch:** `spike/01-rls-with-tenant`
- **Outcome:** the pattern works. The founder chose option (a) for platform-wide reads (D-7).

## In one paragraph

A transaction-scoped tenant setting, read by a forced row-level security policy, kept
two schools completely apart under every attack the spike could think of, including
when PgBouncer handed the same Postgres connection back and forth between them. The
deliberately wrong version, a session-level setting, did leak, which shows the test
would catch the mistake. Forcing RLS turned out to matter beyond the table owner: without
it, a view leaked the other school's rows. The policy costs nothing measurable: Postgres
uses the tenant index with the policy as the index condition.

## What was built

| Piece                                                              | Where                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| PgBouncer 1.26.1 in transaction mode, 2 server connections         | `docker-compose.yml`, `docker/pgbouncer/`                     |
| Roles `akoso_migrator`, `akoso_app`, `akoso_platform_reader`       | `docker/postgres/init/01-roles.sql`                           |
| `createDatabase()` and `withTenant()`                              | `packages/db/src/client.ts`, `with-tenant.ts`                 |
| Two spike tables, a view, two platform tables, a cross-school view | `packages/db/src/spike/setup.ts`                              |
| 40 database tests in four files                                    | `packages/db/src/spike/*.db.test.ts`, run with `pnpm test:db` |
| A CI job running them on Linux                                     | `.github/workflows/ci.yml` (job "Database tests")             |

The image is `edoburu/pgbouncer:v1.26.1-p0`, pinned. There is no official image; this
one is actively maintained (updated 19/10/2026), where the Bitnami image has not been
updated since September 2025.

## Answers

### 1. Does a transaction-scoped setting survive Drizzle, `pg` and PgBouncer, without leaking? **Yes.**

- 40 concurrent callers, alternating between two schools, shared PgBouncer's 2 server
  connections. Every caller saw exactly its own school's rows and its own setting.
- The test checks that at least one Postgres server process served **both** schools, so
  the reuse really happened.
- After a transaction, ten more queries on the same pool read an empty setting.
- **Negative control:** two clients set the school for the whole session
  (`set_config(..., false)`) and committed. A third client, which never set a school,
  then counted **school A's 3 students**. This is exactly the leak a session-level
  setting causes behind a transaction pooler, and the reason `withTenant()` passes `true`.

### 2. With no school set, does everything return nothing, without errors? **Yes.**

Every tenant table returned 0 rows, and inserts were refused. The `nullif(..., '')` in
the policy matters: once a connection has used the setting, an unset value reads back as
an empty string, and casting that to `uuid` would raise an error instead of matching
nothing. An error invites someone to "fix" it by working around the policy.

### 3. Can the app role escape row-level security? **Not by any route tried.**

| Attempt                                             | Result                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| Read or filter for school B's rows by ID            | 0 rows                                                   |
| Insert a row stamped with school B                  | Refused by the policy's `WITH CHECK`                     |
| Update or delete school B's rows                    | 0 rows affected                                          |
| Move its own row to school B                        | Refused by `WITH CHECK`                                  |
| `SET ROLE akoso_migrator`                           | Permission denied                                        |
| `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`        | Must be owner                                            |
| `SET row_security = off`                            | Error: the query would be affected by row-level security |
| Read through a view owned by the table owner        | Only its own school (because RLS is forced)              |
| Create a `SECURITY DEFINER` function to read for it | Permission denied for the schema                         |
| Read the platform reader's cross-school view        | Permission denied                                        |
| Edit or delete a payment, even its own              | Permission denied (append-only)                          |

**Not tested:** `COPY`. PostgreSQL's documentation says `COPY table TO` applies the
table's `SELECT` policies; this was not tried, and should be added to the isolation
suite with the real tables.

### 4. Does forcing RLS also bind the table owner? **Yes, and it matters more than expected.**

The migrator, which owns the tables, saw nothing with no school set, and only the
school it set otherwise.

The tests were run twice with row-level security deliberately weakened, as the spec
required:

- **Enabled but not forced:** 4 tests failed. Besides the catalogue check, the owner
  could see every school, and so could **the app role, through a view owned by the
  table owner**. Views run with their owner's rights, so an unforced table leaks through
  any view. This is the strongest reason to force RLS on every table.
- **Disabled:** 14 tests failed, including reads, writes and deletes across schools.

Both were restored, and all 40 tests pass again.

### 5. What does the policy cost? **Nothing visible.**

With 60,005 rows across 202 schools, one school's query planned as:

```
Index Scan using spike_students_tenant_created_idx on spike_students (actual rows=3 loops=1)
  Index Cond: (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
```

The policy's own expression became the index condition, so Postgres read 3 rows, not
60,005. This depends on every tenant table having an index led by `tenant_id`, as the
brief requires.

### 6. How should platform-wide screens read across schools (D-OPEN-5)? **Recommendation: option (a).**

Both options worked. They differ in what they require of the database.

|                                                | (a) Published figures                                                                                                                              | (b) Live cross-school view                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| How                                            | A job visits each school inside `withTenant()`, computes the figure under that school's own RLS, and writes it to a table in the `platform` schema | A view in the `platform` schema reads the tenant tables directly                                    |
| Needs a role that bypasses RLS                 | **No**                                                                                                                                             | **Yes**: the view only works if its owner has `BYPASSRLS`, and creating that role needs a superuser |
| A school's job writing another school's figure | Refused by a policy on the platform table (tested)                                                                                                 | Not applicable                                                                                      |
| Freshness                                      | As fresh as the last job run                                                                                                                       | Live                                                                                                |
| What the platform reader can touch             | Published figures only (tested: no access to school records, no writes)                                                                            | Whatever the view exposes                                                                           |

**Why (a):** it keeps the rule "nothing in the application ever bypasses row-level
security" true without exception. Option (b) puts a `BYPASSRLS` role in the database,
and every view it owns becomes a way around tenant isolation; one careless view and a
platform screen shows children's records. The cost of (a) is freshness, which suits the
founder's dashboard, the platform-fee ledger and health alerts, all of which are read a
few times a day.

**Decided 11/11/2026:** the founder chose option (a), recorded as D-7.

## Other findings

1. **Port 5432 was taken** on this machine by a locally installed PostgreSQL 18 service.
   The Docker Postgres now listens on host port **5433**. The app connects through
   PgBouncer on **6432** either way.
2. **The tenant schema holds only tenant tables.** The catalogue test asserts that every
   table in `public` has `tenant_id` and forced RLS. Platform tables (schools, plans,
   published figures) live in a separate `platform` schema. This makes "a new table
   without RLS" impossible to miss.
3. **Default privileges are a trap for append-only tables.** The migrator's default
   grants give the app role `UPDATE` and `DELETE` on every new table, so an append-only
   table is only safe if its migration revokes them. The real isolation suite should
   also check, from the catalogue, that the app role has no `UPDATE` or `DELETE` on any
   table marked append-only.
4. **Drizzle wraps database errors.** The Postgres message ("permission denied", "row-level
   security") is on the wrapped error's `cause`. The error mapper (brief section 3.1) must
   read it there. Two spike tests first failed for exactly this reason.
5. **Policies were written in SQL, not through Drizzle's schema builder.** Whether
   Drizzle's own policy support can express `FORCE ROW LEVEL SECURITY` was not checked; it
   is a question for the migrations spec.
6. **`withTenant()` takes the database as its first argument:**
   `withTenant(db, tenantId, work)`. `ARCHITECTURE-ESSENTIALS.md` is updated to match.
7. **Not covered by this spike:** where the tenant ID comes from (it must be the
   signed-in user's verified membership; that is the auth spec), the audit-log hash
   chain (risk R20), connection-level timeouts, and production pooler settings.

## What happens next

- **Keep:** `createDatabase()`, `withTenant()` and its unit test, the role set-up, the
  PgBouncer service, the catalogue-driven isolation test and the CI job. They become the
  base of the tenancy work, rewritten against the first real tables.
- **Throw away:** the `spike_` tables, the cross-school view and the
  `akoso_platform_view_owner` role, in `packages/db/src/spike/`. They exist only on the
  spike branch.
- **Next spike:** the offline queue on a real 2 GB Android phone (risk R13).

## Effort

One working session against an estimate of 8 hours. Agent time was not measured to the hour, so `docs/velocity.md` records it as one session.
The estimate allowed for more trouble with PgBouncer authentication than there was.
