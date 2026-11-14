# Permissions Matrix

Who may do what. Permissions are enforced on the server for every operation through one
central permission check; hiding a button is not access control (brief section 6).
Tests are generated from this file for every role and action (section 30), so it must
stay exact.

**Status: skeleton.** It lists the roles and the rules the brief states outright. The
action-by-action matrix is **not written yet**: each slice adds its actions here, in its
spec, for the founder's approval, because any change to what a role can see or do is the
founder's decision (section 3.3). Nothing below is enforced by code yet.

## How action keys work

- Named `<module>.<thing>.<verb>`, e.g. `fees.statement.read`, `results.sheet.submit`.
- Listed in `KNOWN_ACTIONS` (`packages/schemas/src/contracts/index.ts`) and in this file.
  A test fails if a contract names a key that is not listed.
- Checked by `authorize(ctx, key)` in every use case, and again by the route handler from
  the contract's `permission`. Until roles exist (Stage 1, item 5) every check denies.

## Actions in use (Stage 1, item 5)

| Action key                         | Roles                                                     |
| ---------------------------------- | --------------------------------------------------------- |
| `identity.profile.read`            | Every school role                                         |
| `identity.membership.list_own`     | Every school role                                         |
| `audit.event.read`                 | `proprietor`, `school_admin` (D-27; the page comes later) |
| `identity.profile.update`          | Every school role (own profile only)                      |
| `identity.member.read`             | `proprietor`, `school_admin`                              |
| `identity.member.manage`           | `proprietor`, `school_admin` (with the rules below)       |
| `identity.role.manage`             | `proprietor`, `school_admin`                              |
| `identity.role.approve_restricted` | `proprietor` only; **never** in a custom role             |
| `identity.contact.change`          | `proprietor`, `school_admin`                              |
| `identity.mfa.reset`               | `proprietor`, `school_admin`                              |
| `identity.security_log.read`       | `proprietor` (others only through a custom role)          |
| `identity.access_review.read`      | `proprietor` (others only through a custom role)          |
| `setup.school.read`                | Every staff role (not parents)                            |
| `setup.school.manage`              | `proprietor`, `school_admin`                              |

Sign-in part B (`docs/specs/stage-1-sign-in-part-b.md`) added the nine `identity` keys
from `identity.member.read` on. School setup part A
(`docs/specs/stage-2-school-setup-a.md`) added the two `setup` keys; both can go into
custom roles (for example an exams officer who manages subjects).

### Rules for changing access (part B, section 1)

1. Nobody changes their own roles or status, or resets their own number or second step.
2. Only a proprietor grants or removes `proprietor` or `school_admin`, or changes a
   proprietor's or administrator's number or second step.
3. Anyone else grants only roles whose every permission they hold, and puts only
   permissions they hold into a custom role.
4. A school keeps at least one active proprietor.
5. A change of roles, a suspension, a number change and a second-step reset sign the
   person out everywhere.
6. Changing roles, changing a number, resetting a second step and deleting an account
   need a sign-in within the last 10 minutes (`reauth_required` otherwise).
7. A school can't change the number or reset the second step of someone who also
   belongs to another school: Akoso support does it (`docs/runbooks/account-recovery.md`).

### Custom roles

A school combines permissions from the code table's `CUSTOM_ROLE_ACTIONS` into its own
roles. `NEVER_IN_CUSTOM_ROLES` lists those that can never go in; `RESTRICTED_ACTIONS`
lists those only a proprietor can add (empty until the health, notes, custody, payroll
and settlement permissions exist). A custom role can require a second step, and a
school can require one for any built-in staff role (`security.mfa_roles`).

The code table is `packages/schemas/src/permissions.ts`; a test checks it grants only
known actions.

**A second sign-in step is required** for `proprietor`, `school_admin` and `bursar`
(brief section 6), and for any role the school chooses (part B). Until it is set up, every request except setting it up answers `403`
(`mfa_required`). People with a second step cannot sign in by SMS code.

## School roles (section 6)

| Role                     | Key                 | Scope                                                                    |
| ------------------------ | ------------------- | ------------------------------------------------------------------------ |
| Group owner              | `group_owner`       | Owns several branches; consolidated view                                 |
| Proprietor               | `proprietor`        | Full control of one school                                               |
| School administrator     | `school_admin`      | Setup, students, results publishing                                      |
| Bursar                   | `bursar`            | Fees, payments, expenses, payroll                                        |
| Head teacher / principal | `head_teacher`      | Approves results, lesson notes, behaviour                                |
| Vice principal           | `vice_principal`    | Head-teacher permissions the school chooses to delegate                  |
| Safeguarding lead        | `safeguarding_lead` | Restricted pastoral notes, custody restrictions, safeguarding alerts     |
| School nurse / sick bay  | `nurse`             | Health records and sick-bay visits for all students                      |
| Accountant / auditor     | `accountant`        | Read-only finance: fees, payments, payouts, expenses and payroll reports |
| Teacher                  | `teacher`           | Own classes and subjects                                                 |
| Gate / front desk staff  | `gate_staff`        | Pickup verification                                                      |
| Parent / guardian        | `guardian`          | Own children only                                                        |
| Agent                    | `agent`             | Their own referral portal only (section 26.4)                            |
| Student                  |                     | Not in Part 1 (Part 2, section 43)                                       |

Role keys are proposed names; they are confirmed when the identity module is specified.

One person can belong to several schools and hold several roles.

## Akoso team roles (section 26.2)

Akoso staff do not see children's records by default. Access to a school's data happens
only through a support session the school has agreed to.

Team accounts are separate from school accounts and sign in to the admin app with
passkeys only (sign-in part B, section 8). Role keys: `owner`, `support`, `onboarding`,
`finance`, `sales`, `ops` (code table: `TEAM_ROLE_PERMISSIONS`).

| Action key               | Team roles |
| ------------------------ | ---------- |
| `team.member.read`       | `owner`    |
| `team.member.manage`     | `owner`    |
| `team.security_log.read` | `owner`    |

None of these can go into a school's custom role. The other team roles get their actions
with the features that need them. Rules: nobody changes their own roles or removes their
own access; the team keeps at least one Owner; granting or removing the Owner role needs
the person's email typed in; inviting, changing roles and removing access need a passkey
sign-in within 5 minutes.

| Role                   | Can do                                                                                                   | Cannot do                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Owner                  | Everything, including team roles, pricing, platform-fee settings, emergency switches and closing schools |                                                                                            |
| Support                | View a school's setup, settings and tickets; open a consented support session                            | Change money records or fee settings; export personal data                                 |
| Onboarding / migration | Set up a school and run imports during its onboarding                                                    | Access the school after onboarding ends, unless the Owner grants it again for a set period |
| Finance                | Akoso's platform-fee ledger, invoices, direct-debit mandates, credits and agent commissions              | See children's records or school-fee details beyond totals                                 |
| Sales                  | Leads, demos and sign-up requests                                                                        | See any school's data                                                                      |
| Ops / engineering      | System health, job queues, provider status and logs                                                      | See school records; change data outside a recorded break-glass session                     |

## Rules the brief states outright

These become tests as soon as the code they govern exists.

### Restricted permissions (section 6)

These stay with named roles and can be added to a custom role only with the proprietor's
explicit approval: **health records, restricted notes, custody restrictions, payroll and
settlement-account changes.**

### Sensitive data

| Data                            | Who can see it                                                                                                      | Brief |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| Health records, sick-bay visits | School nurse, head teacher, safeguarding lead, and any role the proprietor explicitly allows. Every view is audited | 21    |
| Restricted pastoral notes       | Head teacher and safeguarding lead                                                                                  | 21    |
| Custody restrictions            | Set and seen only by proprietor, head teacher and safeguarding lead. Every view and change is audited               | 9     |
| Login and security event log    | The school's proprietor                                                                                             | 6     |

### Results (section 11)

- Only the head teacher can unlock an approved score sheet.
- A teacher works only on their own classes and subjects.
- Approved (locked) sheets cannot be changed offline.

### Two-person control (section 28.3)

A second authorised person must approve: unlocking approved results after publishing;
large discounts and write-offs; refunds above a threshold; payroll approval; changing a
school's settlement bank account; bulk deletions; moving a payment above a school-set
amount (section 14).

### Parents

- A guardian sees their own children only.
- A person marked "no access to records" is refused in the parent app, messaging and
  statements; a person marked "do not release to" is refused at the gate check.

### Support sessions (section 26)

View only by default. **Never allowed**, even with the school's permission: moving or
refunding money; changing fee, bank or platform-fee settings; exporting personal data;
viewing health records, restricted notes or custody restrictions.

### Agents (section 26.4)

An agent never sees any school's data beyond a referred school's name, stage and the
amounts their commission is based on.

## Custom roles

Schools combine permissions from the matrix into their own roles (for example "Exams
officer") and give one person several roles, within the restricted-permission rule above.

## The matrix

To be filled in slice by slice. Format:

| Action key   | Description | Roles allowed | Conditions | Two-person | Audited | Spec |
| ------------ | ----------- | ------------- | ---------- | ---------- | ------- | ---- |
| _(none yet)_ |             |               |            |            |         |      |

Action keys follow `module.entity.verb`, for example `fees.statement.read`.
