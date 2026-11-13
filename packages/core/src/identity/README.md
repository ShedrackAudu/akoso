# identity

Sign-in (phone OTP, email and password, MFA), users, memberships, roles, custom roles and the central permission check.

- **Product name:** Platform
- **Brief:** sections 6, 26.2 (`docs/brief/`)
- **Main entities:** users, user_credentials, sessions, verifications, two_factors, user_backup_phones, security_events (platform tables); memberships, custom_roles, membership_custom_roles, contact_changes (tenant tables). The per-school settings table belongs to tenancy
- **Public interface:** `index.ts`: `getAuth()` (Better Auth), `resolveSignedIn()` (the signed-in context for every request), `accessFor()`, `getMe`, `listMySchools`, `getSecurityStatus`, `normalisePhone`; part B: people with access (`listMembers`, `changeMemberRoles`, `setMembershipStatus`), custom roles, the security log and access review, my account (name, numbers, email, deletion) and school-assisted recovery (`startNumberChange`, `confirmNumberChange`, `resetMemberMfa`)
- **Jobs and events:** none yet
- **Specs:** `docs/specs/stage-1-sign-in.md` (part A, built), `docs/specs/stage-1-sign-in-part-b.md` (school side built; Akoso team sign-in next)

## Where this module lives

| Layer          | Path                                 |
| -------------- | ------------------------------------ |
| Use cases      | `packages/core/src/identity/`        |
| Tables and RLS | `packages/db/src/schema/identity.ts` |
| Zod schemas    | `packages/schemas/src/identity.ts`   |

**Status:** part A built: parent code sign-in, staff password and authenticator sign-in, sessions, memberships, the school picker and the permission check. Part B's school side built: custom roles, people with access, the security log, backup numbers, number and email changes, recovery and account deletion. Akoso team sign-in (passkeys, the admin app) is part B's second pull request.
