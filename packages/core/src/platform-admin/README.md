# platform-admin

The Akoso team's admin area: school management, leads and sign-up approvals, support tickets and consented support sessions, emergency switches, announcements to schools and the school exit process.

- **Product name:** Platform
- **Brief:** section 26 (`docs/brief/`)
- **Main entities:** platform_staff, platform_role_assignments, leads, signup_requests, agent_applications, support_tickets, support_access_grants, emergency_switches, platform_announcements, tenant_exits
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                       |
| -------------- | ------------------------------------------ |
| Use cases      | `packages/core/src/platform-admin/`        |
| Tables and RLS | `packages/db/src/schema/platform-admin.ts` |
| Zod schemas    | `packages/schemas/src/platform-admin.ts`   |

**Status:** placeholder. Nothing is implemented yet.
