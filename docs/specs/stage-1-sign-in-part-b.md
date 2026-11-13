# Sign-in part B: roles, recovery, the security log and Akoso team sign-in

- **Status:** School side built (13/11/2026, pull request 1); Akoso team sign-in next. Approved (founder, 13/11/2026), with all six recommendations: the security log shows staff account events and school-caused guardian events; Akoso support handles people in other schools; account deletion at once; passkey-only team sign-in in separate tables; the new permissions; the passkey dependency
- **Module:** `identity` (`packages/core/src/identity`, `packages/db/src/schema/identity.ts`, `packages/schemas/src/identity.ts`, `packages/schemas/src/permissions.ts`), `packages/providers/src/email` (the fake sender), `apps/web` (school settings and account screens), `apps/admin` (Akoso team sign-in) · **Brief:** sections 6, 26.2, 28, 29 · **Stage:** 1, item 5 (part B)
- **Estimate:** 64 hours of agent time: 40 for the school side (pull request 1), 24 for Akoso team sign-in (pull request 2)
- **New dependency (for your approval):** `@better-auth/passkey` 1.7.14, Better Auth's own passkey plugin (published 26/10/2026, so older than two weeks). It brings `@simplewebauthn/server` 13, the standard WebAuthn library. Only the admin app uses it.

## Why now

Part A gave sign-in, memberships and the permission check. The Stage 1 row of the build
order also names **custom roles and Akoso team roles (26.2)**, and brief 6 asks for:

- the proprietor's security log
- profile editing and account deletion
- the phone-number change for people who lose their SIM

Every later screen depends on schools being able to say who may do what. This part is
the last of Stage 1's items before the checkpoint.

## Two pull requests

1. **School side** (sections 1 to 7): the team-access screen, custom roles, the security log and access review, profile, backup number, the phone-number change, MFA reset, and account deletion.
2. **Akoso team sign-in** (section 8): passkeys in the admin app, team roles and offboarding.

They share this spec and are approved together. The second doesn't depend on the first, apart from the permission table.

## User stories

- As a **proprietor**, I see who has access to my school, with their roles, whether they use a second step, and when they last signed in. I can change their roles or suspend them.
- As a **proprietor**, I create an "Exams officer" role from the permissions Akoso offers, and only I can put a sensitive permission (health records, payroll) into a role.
- As a **proprietor**, I see my school's sign-in and security log, so I notice a stolen password.
- As a **school administrator**, I change a parent's sign-in number after checking who they are in person, when they've lost their SIM.
- As a **parent**, I add a second number, so losing one SIM doesn't lock me out.
- As **anyone**, I edit my name, and can delete my account.
- As the **founder**, I sign in to the admin app with a passkey, invite my team with roles that fit their jobs, and remove someone's access the moment they leave.

## What it does

### 1. People with access (school settings)

`/{slug}/settings/team` lists every membership in the school:

- name, roles, status (active or suspended), second step on or off, last sign-in
- staff first, then guardians (filterable; guardians can number in the thousands)

**Changes** (permission `identity.member.manage`):

- change a person's roles (built-in and custom)
- suspend or reactivate a membership

**Adding new staff** stays in Stage 2 (staff records, brief 9). Until then the seed and support create memberships.

**Rules against climbing privileges** (enforced in the use case, tested per rule):

1. **Nobody changes their own roles or status.**
2. **Only a proprietor** grants or removes `proprietor` or `school_admin`.
3. **Anyone else** can grant only a role whose every permission they hold themselves.
4. **The last active proprietor** can't be removed or suspended.
5. **A role change signs out** that person's sessions (brief 6: rotation on privilege change). Permissions are re-read on every request anyway; this is belt and braces.
6. **Fresh sign-in:** granting roles, approving restricted permissions, changing a number, resetting MFA and deleting an account each need a sign-in within the last 10 minutes. Otherwise the screen asks for the password (and second step) or code again.

Every change goes into the school's audit log (`recordAudit`, item 6) and the security log.

### 2. Custom roles

`/{slug}/settings/roles` (permission `identity.role.manage`): a role has

- a name, unique in the school ("Exams officer")
- a short description
- a set of permissions, chosen from the permissions matrix (`docs/permissions.md`)
- whether it requires a second step

**Restricted permissions** (brief 6): health records, restricted notes, custody restrictions, payroll and settlement-account changes.

- They're marked in the code table (`RESTRICTED_ACTIONS`). None of them exist yet; each arrives with its feature, already marked.
- Only a **proprietor** may put one into a custom role. That's the "explicit approval" the brief asks for, recorded with who approved it and when (permission `identity.role.approve_restricted`).
- Anyone else who tries is told "Only the proprietor can add this permission."

**Some permissions can never go into a custom role:** `identity.role.approve_restricted`, and every Akoso team permission. A test checks the list.

**What a person may do** = the permissions of their built-in roles plus their custom roles.

**Removing a role:**

- A role still assigned to someone can't be deleted. It can be archived, which removes nobody's access but hides it from new assignments.
- Changing a role's permissions signs out everyone holding it.

**The school can require a second step** for any staff role (brief 6):

- per custom role, by its own setting
- for built-in roles, through a school setting (`security.mfa_roles`)

Proprietor, school administrator and bursar always require it, and the setting can't remove them.

**School settings:** this adds a small per-school settings table, `platform.school_settings`. Like platform settings (item 6), each key is declared in code with its Zod schema and default. Its first key is `security.mfa_roles`. Support-session consent (brief 26) will be its next.

**Limits for now:** the matrix holds few permissions yet (item 5's and the audit reader's). Custom roles become useful as each Stage 2+ slice adds its own. The mechanism is built and tested now.

### 3. The security log and the access review

`/{slug}/settings/security` (permission `identity.security_log.read`: proprietor, as the brief says; the proprietor can grant it to others through a custom role).

**What it shows** (open question 1):

- **For staff of this school:** all their account events: sign-ins and failures, locks, second-step changes, password changes, sessions revoked. These events belong to the account, not the school, so a teacher in two schools appears in both schools' logs.
- **For guardians:** only the events the school caused: number changes, suspensions, and roles changed. A school of 800 families would otherwise see thousands of parents' sign-ins and IP addresses, which is noise for the school and more personal data than it needs (brief 29: data minimisation).
- Each row shows the time (in the school's time zone), the person, what happened, the device type, and the IP address.
- Newest first, with cursor pages.
- **Filters:** person, kind, and failures only.

**How it is read safely:** `security_events` isn't a tenant table (a person spans schools). The log is read through a `SECURITY DEFINER` function, `platform.school_security_log(...)`. It takes the school from the request's tenant setting, never from a parameter, and applies the rule above. The app role can't read other schools' staff events by any other route. The isolation suite gains a case for it.

**Access review** (brief 28: quarterly, for the school), on the same page:

- every staff member with an elevated role (proprietor, school administrator, bursar, safeguarding lead, nurse, accountant, or any role with a restricted permission)
- their last sign-in and second-step status
- downloadable as CSV

The quarterly reminder comes when messaging exists (Stage 5).

**Alerting** (brief 6: "lockout and alerting"): a lock shows at the top of the log until it is seen. A text or WhatsApp alert waits for messaging (new tech-debt item).

### 4. My account

`app.{domain}/account`, for everyone:

- **Name:** change the name shown to schools.
- **Email (staff):** change it. A link goes to the new address and a notice to the old one; the new address works once confirmed.
  - Email goes through a new `EmailSender` interface in `packages/providers`, with a fake sender, like SMS in part A: kept in memory for tests, printed to the console in development, and refused in production.
  - The real sender (Resend or SES) comes when you open that account. It's already a founder task.
- **Phone number:** change it yourself when you still have the old one. A code goes to the new number and another to the old; both must be entered. Everyone else uses the school (section 5).
- **Backup number (brief 6):** add one more number, confirmed by a code. It can sign in with a code just like the main number, and it gets a notice if the main number is changed. One backup per person.
  - **A number belongs to one account only,** as main or backup. The database enforces this across both.
- **Second step, password, sign out everywhere:** as in part A (`/account/security`).

A **backup email for parents** waits for the real email sender (see "Out of scope").

### 5. The school changes a sign-in number (account recovery)

For a person who has lost the number they sign in with (brief 6). Permission `identity.contact.change`: proprietor and school administrator.

**Steps:**

1. The administrator opens the person from the team-access page, chooses "Change sign-in number", and records:
   - how they checked identity: in person, or by video call
   - what they saw, as a fixed list: a parent's ID card, the child's details, a staff ID, or other, with a short note
   - the reason: SIM lost, number changed, or other

   No document numbers are stored.

2. The administrator enters the new number. A code goes to it, and the person reads it back, which proves they hold that number.
3. On a correct code:
   - the number changes
   - all the person's sessions are signed out
   - the old number and any backup number or email get a notice: "Your Akoso sign-in number was changed by Greenfield Academy on 13/11/2026. If this wasn't you, contact the school."
   - the change goes into the school's audit log and the security log

**Who it can't be used on:**

- **Someone with a second step** (proprietor, administrator, bursar, and others the school chose). They don't sign in by code, so a number change gives no access; they recover through MFA reset (section 6).
- **Someone with active memberships in another school** (open question 2). An account spans schools, so Greenfield's administrator must not be able to take over a parent's access at St Anne's. Such changes go to Akoso support, with a runbook (`docs/runbooks/account-recovery.md`, new) covering the identity checks with each school.
- **The administrator's own account.**

**Limits** (platform settings, `limits.contact_change`):

- 5 changes per school per day
- 1 per person per 30 days; more needs Akoso support

### 6. MFA reset by the school

For a staff member who has lost their authenticator and their backup codes (part A's edge case). Permission `identity.mfa.reset`: proprietor and school administrator.

- The same identity check and record as section 5.
- The reset removes the authenticator and backup codes and signs the person out. They must set it up again at their next sign-in, which part A already forces.
- **The same rules apply:**
  - not your own
  - only a proprietor resets a proprietor or administrator
  - not a person with memberships in other schools (Akoso support does it)
- **A proprietor who is alone and locked out** goes to Akoso support (the runbook).

### 7. Account deletion

From `/account` (brief 6 and 29):

- **Fresh sign-in,** then a confirmation screen saying plainly what happens:
  - "Your sign-in is deleted and you can't sign in again."
  - "Your schools keep their own records about you and your children (fees, results), as the law allows. Ask each school if you want those removed."
- **It takes effect at once** (open question 3). There is no waiting period, because that needs the job runner, which doesn't exist yet.
  - The harm of a mistake is small: the school can add the person again, and a new sign-in is created.
- **Refused for the last active proprietor** of any school. They must hand over first.

**What is removed:**

- password, second step, sessions, and backup number
- the user record keeps its ID, so audit records still point at something, but its name, phone number and email are wiped. It is marked deleted.
- every membership ends (new status `ended`), recorded in each school's audit log

**What stays:**

- security events, for 12 months (brief 28 retention), then removed by a job once the worker runs (tech debt)
- the schools' own records (Stage 2), which are the school's to keep or erase (brief 29)

**Full data export and subject-access requests** come with brief 29's privacy tools (Stage 6).

### 8. Akoso team sign-in (admin app, pull request 2)

**Team accounts are separate from school accounts** (open question 4):

- their own tables: `platform.team_users`, `team_sessions`, `team_passkeys`, `team_verifications`
- their own Better Auth instance
- their own cookie, host-only on `admin.{domain}`

**A school session never works in the admin app,** and a team session never works in the school app. The founder can also be a school user, but those are two separate accounts.

**Passkeys only.** There are no passwords and no SMS codes (brief 26.2):

- **Sign-in:** a passkey with user verification (fingerprint, face, or device PIN) on `admin.{domain}`.
- **At enrolment:** register one passkey. You get 10 recovery codes, shown once, and the screen strongly recommends a second passkey (a security key, or another phone).
- **A recovery code:**
  - signs in once and goes straight to registering a new passkey
  - is recorded as a security event
  - shows as an alert on the Owner's dashboard

**The first Owner:**

- A command the founder runs, `pnpm team:invite-owner <email>`, creates the Owner and prints a single-use enrolment link valid for 30 minutes.
- It refuses if an active Owner already exists.
- It needs the migrator database role, so only someone with production database access can run it.

**Invitations:**

- The Owner invites a team member with roles. The enrolment link (single use, 24 hours) is shown once for the Owner to pass on.
- When a real email sender exists, it's emailed instead.

**Team roles:** owner, support, onboarding, finance, sales and ops (brief 26.2), in the permission table as team actions (open question 5 lists them). One person can hold several.

**Re-authentication:** inviting, granting roles and removing access need a passkey check within the last 5 minutes.

**Typed confirmation** while the Owner works alone (brief 26.2): granting the Owner role, and removing an Owner, need the person's email typed in. The 10-minute delay the brief describes is for prices, emergency switches and closing schools, and comes with those features.

**Offboarding:** "Remove access" ends the member at once. It:

- deletes their sessions and passkeys
- records the change in the team audit log
- refuses for the last Owner

**Sessions:** 8 hours from sign-in, and signed out after 30 minutes idle (brief 26.2: short idle timeouts).

**The team audit log:** item 6's audit log is per school. Team actions go into `platform.team_audit_events`, a separate chain with the same hash-chain trigger and the same verification.

**Screens in `apps/admin`:**

- sign-in
- enrol
- the team list, an invitation page, and a member page (roles, remove access)
- my security: passkeys and recovery codes
- the team security log

Nothing else in the admin app exists yet. Each later feature (support sessions, the founder's dashboard) adds its screens behind this sign-in.

**Local development:** passkeys work on `localhost`. The end-to-end tests use Chrome's virtual authenticator.

## Data changes

| Table                                                                         | Tenant                                 | Notes                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `platform.custom_roles`                                                       | **Yes:** RLS forced, isolation fixture | `tenant_id`, name (unique per school, ignoring case), description, `permissions text[]`, `requires_mfa`, restricted approval (by, at), `archived_at`, `created_by`, timestamps |
| `platform.membership_custom_roles`                                            | **Yes:** RLS forced, isolation fixture | `tenant_id`, membership, custom role; unique on all three; granted by and when                                                                                                 |
| `platform.school_settings`                                                    | **Yes:** RLS forced, isolation fixture | `tenant_id`, key, `value jsonb`; declared in code with a Zod schema and default                                                                                                |
| `platform.memberships`                                                        | Yes (changed)                          | Status gains `ended`; adds `ended_at` and `ended_reason`                                                                                                                       |
| `platform.users`                                                              | No (changed)                           | Adds `deleted_at`; name, phone and email cleared on deletion                                                                                                                   |
| `platform.user_backup_phones`                                                 | No                                     | User, normalised number (unique), verified time. A trigger keeps a number unique across main and backup numbers                                                                |
| `platform.security_events`                                                    | No (changed)                           | Adds `tenant_id`, nullable: set for events a school caused. New kinds: roles changed, membership suspended or ended, number changed, MFA reset, account deleted                |
| `platform.contact_changes`                                                    | **Yes:** RLS forced, isolation fixture | Who, by whom, the identity-check method, what was seen, reason, note, time. No document numbers, and the new number is held only as its last 3 digits                          |
| `platform.team_users`, `team_sessions`, `team_passkeys`, `team_verifications` | No                                     | Team accounts, sessions (8 hours, 30 minutes idle), WebAuthn credentials (public keys only) and recovery codes (encrypted, as part A's backup codes)                           |
| `platform.team_role_grants`                                                   | No                                     | Team member, role, granted by and when                                                                                                                                         |
| `platform.team_security_events`                                               | No                                     | Like `security_events`, for team accounts. Append-only                                                                                                                         |
| `platform.team_audit_events`                                                  | No                                     | One hash chain for team actions, with the item 6 trigger and verification. Append-only                                                                                         |

- **New functions:**
  - `platform.school_security_log(...)`: `SECURITY DEFINER`; the school comes from the tenant setting.
  - `platform.verify_team_audit_chain()`.
- **Grants:** the app role reads and writes the school-side tables as it does part A's. Only the identity module touches the team tables, and the school app never queries them; a dependency-cruiser rule keeps team code out of `apps/web`.
- **Seed:** the team access page needs variety, so the seed adds a custom role per school ("Exams officer"), a suspended teacher, a parent with a backup number, and a local Owner with an enrolment link printed by the seed (never a stored passkey).

## Permissions

| Action key                         | Roles                                                   | In custom roles? |
| ---------------------------------- | ------------------------------------------------------- | ---------------- |
| `identity.profile.update`          | Every school role (own profile only)                    | Yes              |
| `identity.member.read`             | `proprietor`, `school_admin`                            | Yes              |
| `identity.member.manage`           | `proprietor`, `school_admin` (with the section 1 rules) | Yes              |
| `identity.role.manage`             | `proprietor`, `school_admin`                            | Yes              |
| `identity.role.approve_restricted` | `proprietor` only                                       | **Never**        |
| `identity.contact.change`          | `proprietor`, `school_admin`                            | Yes              |
| `identity.mfa.reset`               | `proprietor`, `school_admin`                            | Yes              |
| `identity.security_log.read`       | `proprietor`                                            | Yes              |
| `identity.access_review.read`      | `proprietor`                                            | Yes              |
| `team.member.read`                 | Team `owner`                                            | Never (team)     |
| `team.member.manage`               | Team `owner`                                            | Never (team)     |
| `team.security_log.read`           | Team `owner`                                            | Never (team)     |

Other team roles get no team actions yet. Each arrives with the feature that needs it (support sessions, the fee ledger). `docs/permissions.md` gains all of these, the `RESTRICTED_ACTIONS` list, and the "never in custom roles" list. Tests are generated from the table as in part A.

## Edge cases

- **A person who is a teacher and a parent in the same school:** one membership with both roles. Suspending suspends both. To remove only the teacher role, change roles instead.
- **A teacher who works in two schools:** each school manages only its own membership. Their sign-ins show in both schools' logs (section 3).
- **A custom role with the same name as a built-in role:** refused ("Teacher" is taken).
- **A number change to a number another account already uses:** refused, without saying whose it is ("This number can't be used. Ask the person for another.").
- **A school suspended or closed (item 4):** its settings screens follow the school's status rules. A closed school's memberships stay as they are; nobody can sign in to it.
- **A deleted user in an old audit record:** shows as "Deleted account" with the same ID.
- **A team member who loses every passkey and recovery code:** another Owner re-invites them. A lone Owner re-runs the owner command after removing the old Owner directly in the database: a break-glass step in the runbook, itself recorded.
- **A passkey on a shared computer:** the sign-in always asks for user verification. A browser that can't do it is refused.

## Threat model (STRIDE)

| Threat                     | Example                                                                                                                 | Mitigation                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A caller pretends to be a parent who "lost their SIM"; phishing an Akoso team member                                    | Recorded identity check, plus a code to the new number in front of the administrator; notices to the old number and backups; limits. Team: phishing-resistant passkeys, no passwords                                      |
| **Tampering**              | An administrator edits a role to give themselves payroll; a request changes its own roles                               | Can't change your own roles; grant only what you hold; restricted permissions need the proprietor; all re-checked on the server and audit-logged                                                                          |
| **Repudiation**            | "I didn't change that number"; "I didn't grant that role"                                                               | Each change is in the school's hash-chained audit log, with who, when, and the identity-check record. Team actions are in their own chain                                                                                 |
| **Information disclosure** | One school reads another school's staff sign-ins; the log exposes parents' IP addresses; a refusal reveals whose number | The log is read only through a definer function keyed to the request's school, with an isolation test. Guardians' sign-ins are not shown. Refusals don't name the other account                                           |
| **Denial of service**      | A rogue administrator suspends everyone; mass number changes                                                            | The last proprietor can't be removed; only proprietors manage administrators; number changes limited per school and per person; everything is in the log the proprietor reads                                             |
| **Elevation of privilege** | A school takes over a parent's account at another school; a school session used in the admin app                        | No number change or MFA reset for people with memberships elsewhere (Akoso support only). Team accounts, cookies and sessions are entirely separate, on their own host; a boundary rule keeps team code out of `apps/web` |

## Acceptance criteria

**Pull request 1, the school side:**

1. **Team access:** the proprietor lists people, changes roles and suspends a teacher. The teacher's next request answers 404 for that school, and their sessions are signed out. Each change is in the audit log and the security log.
2. **Privilege rules:** one test per rule in section 1: own roles, proprietor-only roles, grant only what you hold, the last proprietor, and fresh sign-in.
3. **Custom roles:** a custom role grants exactly its permissions, as the generated tests show. A non-proprietor can't add a restricted permission (tested with a test-only restricted action). "Never" permissions can't be added. A role requiring a second step forces setup.
4. **Security log:** shows this school's staff events and the school-caused guardian events, and nothing from another school (isolation test on the definer function). Times are in the school's time zone. The CSV access review lists elevated roles, last sign-in and MFA status.
5. **Number change:** after the recorded check and a correct code to the new number, the parent signs in with the new number. The old number gets the notice (fake sender); sessions are signed out. It's refused for people with a second step, people in other schools, and over the limits.
6. **Backup number:** a parent adds one, confirms it, and signs in with it. A number can't be used by two accounts as main or backup (database test).
7. **MFA reset:** works for a bursar by the proprietor, and the bursar is forced to set it up again. It's refused for your own account and for people in other schools.
8. **Account deletion:** a parent deletes their account and can't sign in. Their memberships are `ended`, their name, phone and email are wiped, and audit records still resolve. It's refused for the last proprietor.
9. **Email:** a staff email change confirms by link (fake sender). Codes, links and tokens appear in no log line.

**Pull request 2, Akoso team sign-in:**

10. **Owner bootstrap:** the command creates the Owner, refuses a second Owner, and the link works once within 30 minutes.
11. **Passkey sign-in** (Chrome virtual authenticator, end to end): enrol, sign in, sign out. A recovery code works once and forces a new passkey.
12. **Separation:** a school session gets 401 in the admin app, and a team session gets 401 in the school app. Cookies are host-only on their own address.
13. **Invite and offboard:** the Owner invites a Support member. Removing their access ends their session at once and deletes their passkeys. The last Owner can't be removed. Each step is in the team audit chain, which verifies.
14. **Sessions:** a team session ends after 30 idle minutes and after 8 hours.

**Both:**

15. **Docs:** `docs/permissions.md`, the identity README, `ARCHITECTURE-ESSENTIALS.md` and the new runbook `docs/runbooks/account-recovery.md` describe the result.

## Out of scope (later)

- **Adding staff and importing guardians** (Stage 2). This part manages existing memberships only.
- **A backup email for parents,** and sending real email (with the email provider).
- **Text or WhatsApp security alerts,** and the quarterly review reminder (Stage 5 messaging).
- **The waiting period before account deletion,** removing security events after 12 months, and the full data export (when the worker runs; brief 29 tools).
- **Support sessions (impersonation)** and the "who accessed our school" page (with the admin app's support features).
- **The 10-minute cancellable delay** on the Owner's riskiest actions (with prices and emergency switches).
- **Student sign-in** (Part 2).

## Open questions

1. **What the proprietor's security log shows.** I recommend all account events for staff, and only school-caused events for guardians (number changes, suspensions), to keep parents' sign-in times and IP addresses out of every school's view. The alternative is to show everything for everyone.
2. **People who belong to more than one school.** I recommend that a school can't change their sign-in number or reset their second step; Akoso support does it, following a runbook. Otherwise one school's administrator could take over someone's access at another school.
3. **Account deletion at once,** with a fresh sign-in and a plain confirmation, rather than a 7-day waiting period. A waiting period needs the job runner, which comes later. I recommend at once for now, with the waiting period added as tech debt.
4. **Akoso team sign-in:** passkeys only, with recovery codes and no passwords, in separate tables, with a separate cookie on the admin address. I recommend this. The brief asks for passkeys for the Owner and money roles; using them for every team role is simpler and safer.
5. **The new permissions** in the table above, including the security log for the proprietor only (others through a custom role) and the team actions for the Owner only.
6. **The new dependency,** `@better-auth/passkey` 1.7.14.
