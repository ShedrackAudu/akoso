# Sign-in, memberships and the permission check (part A)

- **Status:** Built (12/11/2026). Approved (founder, 12/11/2026), with all five recommendations: authenticator app plus backup codes, staff sign in with email or phone, the session lengths as written, no SMS to unknown numbers, and both dependencies
- **Module:** `identity` (`packages/core/src/identity`, `packages/db/src/schema/identity.ts`, `packages/schemas/src/identity.ts`), `packages/providers/src/sms` (new), `apps/web` (sign-in screens, the school picker, the session wiring in `server/api.ts`) · **Brief:** sections 5.1, 6, 7, 28, 28.4 · **Stage:** 1, item 5 (part A)
- **Estimate:** 40 hours of agent time
- **New dependencies (for your approval):**
  - `better-auth` 1.7.14, the brief's chosen auth library. That's the newest release at least two weeks old.
  - `libphonenumber-js`, to read and normalise phone numbers (`0803…`, `+234 803…`, numbers from abroad) into one format.

## Why split in two

Brief section 6 is large. **Part A** (this spec) is what the Stage 1 checkpoint asks for, "login with OTP and MFA works", plus what every later screen needs:

- who is signed in
- which schools they belong to
- what they may do there

**Part B** (its own spec, next) adds:

- custom roles
- the security log screen for proprietors
- profile editing and account deletion
- the guardian phone-number change
- sign-in for the Akoso team in the admin app, with passkeys

## User stories

- As a **parent**, I sign in with my phone number and a 6-digit code sent by SMS, even on a slow connection, and stay signed in on my phone for weeks.
- As a **teacher or bursar**, I sign in with my email (or phone) and password. Where my role requires it, I also confirm with a code from an authenticator app.
- As someone in **several schools** (a teacher who is also a parent), I sign in once and pick which school I'm working in.
- As the **founder**, I know every request is checked on the server for who the person is, which school they're in, and what their role there allows.

## What it does

### 1. People and their schools

- **One person, one account,** across every school (brief 6). The account belongs to the platform, not to any school.
- **A membership** links a person to one school, with one or more **roles** there: `proprietor`, `teacher`, `guardian`, and the others in `docs/permissions.md`.
  - Memberships are school data: a tenant table under forced row-level security, covered by the isolation suite.
  - A membership can be `active` or `suspended` (for example a teacher who has left). Suspended memberships give no access.
- **Accounts are created by schools, not by sign-up.**
  - Schools add staff and import guardians (Stage 2). There's no public "create an account".
  - Until then, the seed script creates clearly fake people for each seeded school.

### 2. Parents: phone number and a one-time code

1. The parent enters a phone number. It is normalised (`0803 123 4567` → `+2348031234567`).
2. If an account has that number, a **6-digit code** is sent by SMS. It expires after **5 minutes**, and allows **3 attempts**.
3. **If no account has that number, no SMS is sent,** but the screen says exactly the same thing ("If this number is registered, we've sent a code"). Nobody can find out who has an account, and Akoso doesn't pay for texts to strangers, which defeats SMS-pumping fraud (brief 28.4 item 12).
4. On a correct code the parent is signed in, and goes to their school, or to the school picker if they have several.

**Sending** goes through an `SmsSender` interface in `packages/providers`:

- **Locally and in tests,** a fake sender keeps the code in memory for tests. In development only, it also prints it to the server console. It refuses to run when `NODE_ENV=production`.
- **The real sender** (Termii, brief 2) is added when you open the Termii account. It's a founder task, already on the checklist.
- **WhatsApp codes** need an approved template and arrive with messaging (Stage 5).

**Codes are stored only as hashes,** and never logged (brief 6, 28).

### 3. Staff: password, then a second step where required

- **Sign-in:** email or phone number, plus a password.
- **Passwords:**
  - at least 10 characters
  - checked against the most common passwords
  - hashed with scrypt, Better Auth's default (brief 28.4 item 10)
  - reset by a link (email) or a code (phone)
- **Second step (MFA):** an **authenticator app** (time-based codes, such as Google Authenticator), plus **10 one-time backup codes** shown once at setup (open question 1).
  - **Required** for proprietor, school administrator and bursar, as the brief says. The school can later require it for other roles (part B).
  - **Optional** for every other staff role.
  - A person whose role requires MFA, but who hasn't set it up, is taken straight to setup after their password. Nothing else works until they finish: the server refuses every other request, not just the screen.
- **Parents** don't use MFA: the code to their phone is already the second factor.

### 4. Sessions

| Who                             | Lasts                                                                     | Notes                                                         |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Parent                          | 30 days, renewed while in use                                             | Phones stay signed in, as the brief's parent experience needs |
| Staff                           | 7 days, renewed while in use; signed out after 12 hours without activity  |                                                               |
| Staff with an MFA-required role | 12 hours, renewed while in use; signed out after 2 hours without activity | Proprietor, administrator, bursar                             |

(Open question 3.)

- **The cookie:** HttpOnly, Secure, SameSite=Lax, and **host-only on `app.{domain}`**. It carries the
  `__Secure-` prefix and **no Domain attribute**, so the browser keeps it on the app
  address and never sends it to a school's address. (Better Auth names cookies
  `__Secure-`, not `__Host-`; without a Domain attribute the effect is the same, and a
  test checks it.)
- **A new session at every sign-in.** A role change, password change or MFA change signs out the person's other sessions.
- **"Sign out everywhere"** is a button in settings.
- **The mobile app** (Stage 7) gets a **bearer token** instead of a cookie. `/api/v1` accepts either.
- **CSRF:**
  - Better Auth checks the `Origin` header on its own endpoints.
  - Our request pipeline already refuses a cookie write from another origin.
  - Next.js checks server actions' origin.

### 5. The signed-in request

This fills in the one placeholder left by items 3 and 4, `resolveContext` in `apps/web/server/api.ts`. On every page, server action and `/api/v1` call:

1. **Session:** the session (cookie or bearer token) gives the user, or there's none → `401`.
2. **MFA:** if the user's roles require MFA and it isn't set up, everything except MFA setup answers `403` with a code meaning "set up MFA".
3. **School:** the school comes from the address (`app.akoso.ng/greenfield/...`) or the `X-Akoso-School` header. The user must have an **active membership** there, or the answer is `404`.
4. **Status:** the school's status rules apply (item 4).
5. **Permissions:** the person's roles there become their **permissions**, through the role table in `packages/schemas/src/permissions.ts`, which mirrors `docs/permissions.md`.
6. **Done:** the use case gets a full context, and `authorize()` (item 3) checks the action.

This item adds only the permissions it needs:

- `identity.profile.read`: every role
- `identity.membership.list_own`: every role

Each later slice adds its own, for your approval.

### 6. Screens and endpoints

- **`app.{domain}/sign-in`:** two tabs, "Parent" (phone and code) and "Staff" (password), then MFA if needed.
  - School-first wording: when you arrive from a school's page (`/{slug}/sign-in`, which closes T19), the school's name leads.
  - The pages are small and fast (brief 4: the parent bundle budget).
- **`app.{domain}/schools`:** the **school picker**, listing each active membership with the school's name and the person's roles there. With one school, it's skipped.
- **`app.{domain}/{slug}`:** a placeholder home for that school ("Signed in to Greenfield Academy as Teacher"), until real screens arrive.
- **`app.{domain}/account/security`:** set up or reset MFA, see backup codes once, change password, sign out everywhere.
- **`GET /api/v1/me`:** the user's ID, name and whether MFA is on. No phone or email, unless asked for by a later contract.
- **`GET /api/v1/me/schools`:** the picker's list, for the mobile app.

These are the first signed-in contracts. They confirm the authenticated half of item 3's patterns.

### 7. Limits

These use the request pipeline's rate limiter (item 3), with keys hashed:

| What                                     | Limit                                   |
| ---------------------------------------- | --------------------------------------- |
| Code requests per phone number           | 3 per 15 minutes, 10 per day            |
| Code requests per IP address             | 20 per hour                             |
| Code requests to numbers outside Nigeria | 1 per number per 15 minutes             |
| Wrong codes                              | 3 per code, then a new code is needed   |
| Password attempts per account            | 5 per 15 minutes, then a 15-minute lock |
| Password attempts per IP address         | 30 per 15 minutes                       |

- **The lock** is told to the user plainly. It's also recorded as a security event, and shows in the proprietor's log in part B.
- **The numbers** are starting values, tuned from pilot traffic. They move to platform settings with feature flags (T16).

### 8. Security events

`platform.security_events` records, per user (and per school where one applies):

- sign-in succeeded or failed (with the reason, never the password)
- code sent
- account locked
- MFA set up or reset
- password changed or reset
- sessions revoked

It stores times, IP addresses and the device's user agent, but never codes, tokens or passwords. Part B shows it to proprietors (brief 6) and to the quarterly access review (28). The full, hash-chained audit log is item 6.

## What changed while building (12/11/2026)

- **Code sign-in is closed to anyone with a second step,** or whose role needs one.
  Better Auth's second step covers password sign-in only, so an SMS code would have
  skipped it (for example a teacher who is also a parent). Such people sign in with a
  password; no code is sent to them.
- **Staff sessions:** the 7-day and 12-hour limits count from sign-in (they are not
  renewed by use); the idle limits are checked on every request. Parents' 30 days are
  renewed while in use.
- **Cookie prefix** `__Secure-` rather than `__Host-` (see section 4).
- **Session tokens** are stored as Better Auth stores them, not hashed. Backup codes are
  encrypted rather than hashed. Both are readable only by the app role (T21).
- **Codes** are stored as keyed HMAC-SHA-256 hashes, checked by our own verifier.
- **Better Auth's telemetry is switched off.**

## Data changes

| Table                       | Tenant                                 | Notes                                                                                                                                    |
| --------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `platform.users`            | No (a person spans schools)            | Name, normalised phone (unique), email (unique, nullable), verified flags. Better Auth's user table, mapped to our naming                |
| `platform.user_credentials` | No                                     | Password hash (scrypt), per Better Auth's "accounts" table. Never readable outside the auth module                                       |
| `platform.sessions`         | No                                     | Session token (stored as Better Auth stores it, protected by grants: only the app role can read the table), user, expiry, IP, user agent |
| `platform.verifications`    | No                                     | Hashed one-time codes and reset tokens, with expiry and attempt counts                                                                   |
| `platform.two_factor`       | No                                     | Authenticator secret and backup codes, both encrypted with the server secret                                                             |
| `platform.memberships`      | **Yes:** RLS forced, isolation fixture | `tenant_id`, `user_id`, `roles text[]` (checked against the role list), `status`, timestamps, `created_by`                               |
| `platform.security_events`  | No (school ID stored when known)       | Append-only: the app role may insert and read, never update or delete                                                                    |

- **Listing a user's schools across schools:** the picker needs the user's own memberships in every school. That crosses schools, which RLS rightly prevents. A `SECURITY DEFINER` function, `platform.schools_for_user(user_id)`, returns only that user's active memberships with each school's public summary. The app role may call it; it cannot read other users' memberships.
- **Grants:** the auth tables are reachable only by the app role, used by the identity module. `created_by` on the tenancy tables (T18) becomes required once the seed fills it.
- **Seed:**
  - Fake people for each seeded school: a proprietor (with MFA set up), a bursar (without MFA, so the forced setup can be tested), a teacher, two parents, and one parent who belongs to two schools.
  - The fake people's passwords are listed in the seed file and are for local use only.

## Permissions

| Action key                     | Roles            |
| ------------------------------ | ---------------- |
| `identity.profile.read`        | All school roles |
| `identity.membership.list_own` | All school roles |

`docs/permissions.md` gains these, and records which roles require MFA (proprietor, school administrator, bursar).

## Edge cases

- **One number, two people** (a shared family phone): not possible, because a phone number belongs to one account. The school sees this when importing (Stage 2), and the second guardian adds their own number.
- **A suspended membership:** the school disappears from the picker. Its address answers 404 for that person.
- **A parent who changes SIM card:** the school changes the number. That's part B's workflow, with identity checks.
- **A slow 2G or 3G connection:** the sign-in page and the code request stay small. The end-to-end test proves the whole sign-in completes within 60 seconds on an emulated slow 3G connection (the brief's acceptance line).
- **A lost authenticator:** use a backup code. With none left, the school administrator or proprietor resets the person's MFA (part B), and the reset is a security event.
- **A clock that's out on the phone:** authenticator codes accept the previous and the next 30-second window. The server's clock decides.
- **A request for a school the user just left:** 404 on the next request. No cached access survives a membership change for longer than the session lookup.

## Threat model (STRIDE)

| Threat                     | Example                                                                                 | Mitigation                                                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Guessing a code; credential stuffing with leaked passwords; SIM swap                    | 6-digit codes, 5-minute life, 3 attempts, per-number and per-IP limits. Common passwords refused, per-account lock. MFA required for money and admin roles. The phone-number change needs the school's identity check (part B) |
| **Tampering**              | Changing roles or school in a request                                                   | Roles and memberships come only from the database, per request. The school is checked against memberships; strict input everywhere                                                                                             |
| **Repudiation**            | "I didn't sign in"                                                                      | Security events with time, IP and device for every sign-in, code and MFA change                                                                                                                                                |
| **Information disclosure** | Learning who has an account; a session leaking to a school's address; codes in logs     | Identical answers for unknown numbers and emails. Host-only cookie (no Domain attribute). Codes stored only as keyed hashes; codes, passwords and tokens are never logged, and the logger cannot take them                     |
| **Denial of service**      | SMS pumping that burns money on texts; locking out a teacher by guessing their password | No SMS to unknown numbers; tight limits abroad; per-number daily caps. The lock is per account plus IP limits; the lock is short and the school can reset it                                                                   |
| **Elevation of privilege** | Skipping MFA setup; acting in a school after leaving it                                 | MFA is enforced in the server's context step, not the screen. Memberships are re-read on every request; a suspended membership gives nothing                                                                                   |

## Acceptance criteria

1. **Parent sign-in:** a seeded parent signs in by phone and code, end to end, and lands on their school. On an emulated slow 3G connection it completes within 60 seconds.
2. **No information leaks on unknown numbers:** an unknown number gets the same screen and the same timing class as a known one, and no SMS. A test asserts the fake sender received nothing.
3. **Code limits:** codes expire after 5 minutes and allow 3 attempts. The per-number and per-IP limits answer `429`.
4. **Staff sign-in:** a staff member signs in with a password. A bursar without MFA is forced into setup, and every other request answers `403` until it's done. A proprietor with MFA must enter an authenticator code, and a backup code works once.
5. **Sessions:**
   - the cookie is HttpOnly and SameSite=Lax, Secure outside local development, and has
     no Domain attribute (host-only)
   - school addresses never receive it
   - a role or password change signs out the other sessions
   - "sign out everywhere" works
6. **The school picker** lists exactly the user's active memberships. `/{slug}` for a school the user isn't in answers 404.
7. **Bearer tokens:** `GET /api/v1/me` and `/me/schools` work with a bearer token (typed client test) as well as the cookie.
8. **Isolation:** the isolation suite covers `platform.memberships`. `schools_for_user()` returns only the caller's own memberships.
9. **Secrets never logged:** codes, passwords and tokens appear in no log line, which is asserted as in item 3.
10. **Docs:** `docs/permissions.md`, `ARCHITECTURE-ESSENTIALS.md` and the identity module README describe the result. T18 and T19 are closed.

## Out of scope (part B, or later)

- **Custom roles,** and permissions that only the proprietor can grant.
- **The security log screen** for proprietors, and the access review.
- **Profile editing, account deletion,** and the guardian phone-number change with identity checks.
- **Akoso team sign-in** in the admin app, with passkeys.
- **WhatsApp codes** (Stage 5), and the real Termii sender (when you open the account).
- **The Expo app itself** (Stage 7). Its bearer-token sign-in is built and tested here.

## Open questions

1. **The second step for staff.** I recommend an **authenticator app** (free, works offline, safe from SIM swaps), plus backup codes. An SMS code as the second step would be easier for some staff, but costs money per sign-in and is weaker against SIM swaps. It could be added later as an option the school allows.
2. **Staff sign in with email or phone** plus a password. I recommend allowing both, since many Nigerian school staff use phone more than email.
3. **Session lengths** as in the table in section 4. I recommend these. Shorter is safer but means more sign-ins on shared staff-room computers.
4. **No SMS to unknown numbers** (section 2). I recommend this: it saves money and blocks SMS-pumping fraud, and the screen looks the same either way.
5. **The two new dependencies** (`better-auth` 1.7.14, `libphonenumber-js`).
