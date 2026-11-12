# identity

Sign-in (phone OTP, email and password, MFA), users, memberships, roles, custom roles and the central permission check.

- **Product name:** Platform
- **Brief:** sections 6, 26.2 (`docs/brief/`)
- **Main entities:** users, user_credentials, sessions, verifications, two_factors, memberships (tenant table), security_events (built); custom roles, devices, contact_change_requests (later)
- **Public interface:** `index.ts`: `getAuth()` (Better Auth), `resolveSignedIn()` (the signed-in context for every request), `accessFor()`, `getMe`, `listMySchools`, `getSecurityStatus`, `normalisePhone`
- **Jobs and events:** none yet
- **Specs:** `docs/specs/stage-1-sign-in.md` (part A, built); part B next

## Where this module lives

| Layer          | Path                                 |
| -------------- | ------------------------------------ |
| Use cases      | `packages/core/src/identity/`        |
| Tables and RLS | `packages/db/src/schema/identity.ts` |
| Zod schemas    | `packages/schemas/src/identity.ts`   |

**Status:** part A built: parent code sign-in, staff password and authenticator sign-in, sessions, memberships, the school picker and the permission check.
