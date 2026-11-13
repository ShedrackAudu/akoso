# Time zones, the audit log, feature flags and platform settings

- **Status:** Built (13/11/2026). Approved (founder, 12/11/2026), with the three recommendations: hash chain in the database, write-once copy deferred, proprietor and school administrator read the log
- **Module:** `audit` (`packages/core/src/audit`, `packages/db/src/schema/audit.ts`), `tenancy` (flags and settings), `packages/domain/src/time` (new) · **Brief:** sections 3.1, 26, 27, 28.3, 31 · **Stage:** 1, item 6
- **Estimate:** 24 hours of agent time
- **No new dependencies.** Time-zone arithmetic uses the built-in `Intl`. Hashing uses Postgres's built-in `sha256()`.

## Why now

These are the last foundations every later feature leans on:

- **Time:** every due date, attendance day, cash-up day and report period is "today" in the
  school's time zone, never the server's (brief 3.1).
- **The audit log:** every change to school data must be recorded so that editing,
  deleting or inserting a record afterwards is detectable (brief 27, 28.3). Sign-in part B
  (role changes, phone-number changes) needs it straight away.
- **Feature flags:** every new feature is released to a few schools first (brief 3,
  31).
- **Platform settings:** limits and prices are data, not code (brief rule 10). The rate-limit
  numbers (T16) move here.

## What it does

### 1. Time

A small set of pure functions in `packages/domain/src/time`. They have no I/O and also
run in the Expo app.

| Function                           | What it does                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `todayIn(timeZone, now)`           | The date (`YYYY-MM-DD`) it is in that time zone at that moment. At 23:30 UTC it is already tomorrow in Lagos |
| `startOfDay(date, timeZone)`       | The UTC moment a school's day begins, for queries such as "payments received today"                          |
| `endOfDay(date, timeZone)`         | The UTC moment it ends                                                                                       |
| `formatDate(date)`                 | `dd/mm/yyyy` (brief 4.1)                                                                                     |
| `formatDateTime(moment, timeZone)` | `dd/mm/yyyy, 14:05`, in the school's time                                                                    |
| `isValidTimeZone(name)`            | An IANA name the runtime knows, e.g. `Africa/Lagos`                                                          |

- **`schoolToday(ctx)`** in core gives today's date for the request's school. Use cases
  use that; nothing ever reads the server's local date.
- **Dates and moments:**
  - Date-only values (birthdays, due dates, term dates) are a `LocalDate` type (`YYYY-MM-DD`)
    and are stored as Postgres `date`.
  - Moments are `timestamptz` in UTC, as today.
- **A lint rule** forbids `new Date().getDate()`, `toLocaleDateString()` without a time zone,
  and similar calls in `packages/core` and `packages/domain`. This makes the server's local
  time impossible to use by accident.

### 2. The audit log

**What is recorded.**

- Every create, update and delete of school data (brief 27) is recorded, by calling
  `recordAudit()` in the same database transaction as the change.
- If the change rolls back, so does its record. There is never a record of something that
  didn't happen, and never a change without a record.

Each record holds:

| Field      | Example                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| School     | the tenant                                                                                                                                                                                             |
| When       | the server's time, `timestamptz`                                                                                                                                                                       |
| Who        | the person's internal ID, or `system:<job>` for the worker. **Never a name** (brief 28.3), so a person's details can later be deleted without touching the log                                         |
| Action     | `membership.roles.changed`, `student.created`, `score.updated`                                                                                                                                         |
| What       | entity type and internal ID                                                                                                                                                                            |
| Changes    | each changed field with its value before and after. For **sensitive fields** (health data, national IDs, bank details, restricted notes, custody restrictions) only `"changed": true`, never the value |
| Request ID | links the record to the request and its logs                                                                                                                                                           |

**Sensitive fields** are declared once per entity, in the module that owns it. The
`diffForAudit(before, after, sensitive)` helper builds the changes, so no call site can
forget to hide a value.

**Tamper evidence: a hash chain per school** (brief 28.3).

- Each record stores:
  - its sequence number in that school's log
  - the previous record's hash
  - a SHA-256 hash of its own content plus that previous hash
- Editing, deleting or inserting any record breaks every hash after it.
- **The database computes the chain,** in a trigger, not the application. A bug or a
  compromised application server can't write a record with a wrong hash, or skip the
  chain (open question 1).
- **The trigger takes a lock** on the school's chain head, so two records written at the
  same moment can never get the same sequence number.

**Append-only, enforced by the database** (brief 28.3).

- The app role may insert and read audit records. It may never update or delete them.
- The chain-head table is reachable only by the trigger.

**Verification.**

- `platform.verify_audit_chain(school)` recomputes a school's chain and returns the first
  broken record, or nothing.
- The worker runs it **daily for every school** once the worker has its job runner. Until
  then it runs in the test suite and on demand (T15 grows to cover it).
- A broken chain becomes an alert to you (brief 28.3). That alert is wired with
  observability (Sentry), later.

**Not yet** (open question 2):

- **The daily copy to write-once storage** waits for object storage (ADR 0005, R2). It's
  recorded as tech debt.
- **The viewer screens** (school audit page, platform admin viewer) come with the screens
  that need them.

### 3. Feature flags

**Flags are declared in code,** in one typed list (`packages/schemas/src/flags.ts`). Each
has a key such as `results.ai_comment_drafts`, a description, and an **off-by-default**
value. A key not in the list is a type error.

**Per-school overrides are data.**

- They live in `platform.tenant_feature_flags`: school, flag and on or off.
- It's a tenant table under RLS. A school can read only its own flags; it can never change
  them. Only Akoso turns flags on: through the platform admin later (Stage 5), and until then
  by a reviewed script.

**Reading a flag.**

- `isEnabled(ctx, "results.ai_comment_drafts")` reads the school's override, or the
  default.
- Flags are cached for 60 seconds per server instance, like school lookups. A change reaches
  everyone within a minute.
- Turning a flag on or off writes an audit record.

**The first flag** is `system.example`, used only by tests, to prove the mechanism. Real
flags arrive with the features they guard.

### 4. Platform settings

**Settings are declared in code too** (`packages/schemas/src/settings.ts`). Each has a key,
a Zod schema and a default.

**Overrides are data.**

- They live in `platform.platform_settings`: key, JSON value, and who changed it and
  when.
- Every change is audit-logged, in the platform-level audit trail that comes with the admin
  app (part B).

**Reading a setting.**

- `getSetting("limits.api")` validates the stored value against its schema.
- An invalid or missing value falls back to the default, and logs a warning.
- Settings are cached for 60 seconds.

**The first settings are the request limits (closes T16):** `limits.api` (the request
classes in item 3) and `limits.sign_in` (code and password limits from sign-in part A).

## Data changes

| Table                           | Tenant                             | Append-only                                      | Notes                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform.audit_events`         | Yes: RLS forced, isolation fixture | **Yes:** the app role may insert and select only | `id`, `tenant_id`, `seq` (per school), `occurred_at`, `actor`, `action`, `entity_type`, `entity_id`, `changes` jsonb, `request_id`, `prev_hash`, `hash`. Unique on (`tenant_id`, `seq`). The hash fields are filled by the trigger |
| `platform.audit_chain_heads`    | No, but keyed by school            | Updated by the trigger only                      | `tenant_id`, `last_seq`, `last_hash`. No grant to the app role                                                                                                                                                                     |
| `platform.tenant_feature_flags` | Yes: RLS forced, isolation fixture | No                                               | `tenant_id`, `flag_key`, `enabled`, `updated_at`, `updated_by`. The app role may read only                                                                                                                                         |
| `platform.platform_settings`    | No                                 | No                                               | `key`, `value` jsonb, `updated_at`, `updated_by`. The app role may read only                                                                                                                                                       |

**Retention.** Audit records are kept for at least as long as the school's agreement
requires, and never deleted while the school is active. They hold internal IDs only, so
deleting a person's details elsewhere (NDPA requests, brief 29) never touches them.
Retention is recorded in the data retention policy.

## Permissions

| Action key         | Roles                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| `audit.event.read` | `proprietor`, `school_admin` (for the school audit page when it's built) |

No action for writing audit records: only use cases write them, as part of the change
they record. No school role can change flags or settings.

## API and jobs

- **Core use cases:**
  - `recordAudit(tx, ctx, event)`
  - `diffForAudit()`
  - `verifyAuditChain(school)`
  - `isEnabled(ctx, flag)`
  - `getSetting(key)`
  - `schoolToday(ctx)`
- **No `/api/v1` endpoints yet;** the audit viewer arrives with its screen.
- **Rate limits:** the request pipeline and sign-in now read their limits through
  `getSetting`.
- **The daily chain verification** is a worker job when pg-boss arrives.

## Edge cases

- **Midnight in Lagos is 23:00 UTC:** a payment at 23:30 UTC counts as the next day for
  the school. Tests cover this boundary.
- **A school in another time zone** (a future customer abroad): every calculation takes
  the school's own zone. `Africa/Lagos` has no daylight saving, but the functions are
  tested against a zone that does.
- **Two changes at the same instant in one school:** the chain-head lock orders them. No
  gaps and no duplicate sequence numbers.
- **A change that rolls back:** its audit record rolls back with it.
- **A record whose hash is tampered with directly** (by someone with database owner
  access): verification reports it at the next run.
- **An unknown flag key in the database** (e.g. a flag deleted from code): ignored.
- **A setting stored with the wrong shape:** the default is used, with a warning.

## Threat model (STRIDE)

| Threat                     | Example                                                                          | Mitigation                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A record claiming a different person made a change                               | The actor comes from the request context, never the input. The database records the time                                                                                                                                                  |
| **Tampering**              | Editing a score's audit record to hide a change; deleting the record of a refund | Append-only grants (no update or delete for the app role). The hash chain is computed in the database, and the daily verification detects any edit, deletion or insertion. A write-once copy outside the database later (open question 2) |
| **Repudiation**            | "I never changed that score"                                                     | Every change carries its actor, time and request ID, written in the same transaction as the change                                                                                                                                        |
| **Information disclosure** | Health details or bank numbers copied into the log                               | Sensitive fields are declared per entity, and only "changed" is ever recorded. Records hold internal IDs, not names. RLS keeps each school's log to itself                                                                                |
| **Denial of service**      | A burst of writes contending on the chain lock                                   | The lock is per school and held only for the insert. Measured in a test with concurrent writers                                                                                                                                           |
| **Elevation of privilege** | A school turning on a feature it hasn't been given; the app changing settings    | Flags and settings are read-only for the app role. Changes come only from Akoso's admin (later) and are audited                                                                                                                           |

## Acceptance criteria

1. **Time:** the functions pass tests at the Lagos midnight boundary, with a daylight-saving
   zone, and for dates around month and year ends. The lint rule catches a planted
   server-local date call.
2. **Audit records:** `recordAudit` inside a use case's transaction writes a record with the
   right sequence number and hashes. A rolled-back change leaves no record. A sensitive field
   records only `changed: true`.
3. **Append-only:** the app role cannot update or delete `audit_events`, and cannot touch
   `audit_chain_heads` (database test).
4. **Concurrency:** 50 concurrent writes in one school give sequence numbers 1 to 50, with
   no gaps and a valid chain.
5. **Verification:** `verify_audit_chain` passes on a clean chain. It reports the exact
   record after a planted edit, a planted deletion and a planted insertion (done as the
   database owner, as an attacker with full access would).
6. **Isolation:** the isolation suite covers `audit_events` and `tenant_feature_flags`.
7. **Feature flags:** a flag is off by default. A school override turns it on for that
   school only, and the change is seen within the cache time.
8. **Settings:** `limits.api` and `limits.sign_in` are read through `getSetting`, with
   defaults equal to today's numbers. A malformed stored value falls back to the default.
   T16 is closed.
9. **Docs:** `ARCHITECTURE-ESSENTIALS.md` gains the audit and time patterns. The audit
   module README and `docs/permissions.md` are updated.

## Out of scope

- **The audit viewer screens** (school and platform admin).
- **The platform-level audit trail for Akoso staff actions** (with the admin app,
  sign-in part B).
- **The write-once copy** to object storage.
- **The daily verification job's schedule** (with pg-boss).
- **Emergency switches and maintenance mode** (Stage 5, platform admin).

## Open questions

1. **The hash chain computed by the database** (a trigger) rather than by the
   application. I recommend the database: it can't be skipped or got wrong by application
   code. The cost is a small piece of SQL to review.
2. **The write-once copy** waits for object storage, as tech debt. I recommend this rather
   than adding storage now just for the audit copy: the chain plus daily verification
   already detect tampering, and the copy adds recovery.
3. **Who may read a school's audit log** when its page is built: proprietor and school
   administrator. I recommend these two; the brief doesn't name readers.
