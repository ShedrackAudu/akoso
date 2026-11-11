# identity

Sign-in (phone OTP, email and password, MFA), users, memberships, roles, custom roles and the central permission check.

- **Product name:** Platform
- **Brief:** sections 6, 26.2 (`docs/brief/`)
- **Main entities:** users, memberships, sessions, roles, role_permissions, devices, contact_change_requests
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                 |
| -------------- | ------------------------------------ |
| Use cases      | `packages/core/src/identity/`        |
| Tables and RLS | `packages/db/src/schema/identity.ts` |
| Zod schemas    | `packages/schemas/src/identity.ts`   |

**Status:** placeholder. Nothing is implemented yet.
