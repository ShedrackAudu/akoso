# tenancy

Schools (tenants), groups and branches, school addresses and custom domains, per-school feature flags and platform settings.

- **Product name:** Platform
- **Brief:** sections 7, 7.1 (`docs/brief/`)
- **Main entities:** groups, tenants, branches, tenant_domains, feature_flags, platform_settings
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                |
| -------------- | ----------------------------------- |
| Use cases      | `packages/core/src/tenancy/`        |
| Tables and RLS | `packages/db/src/schema/tenancy.ts` |
| Zod schemas    | `packages/schemas/src/tenancy.ts`   |

**Status:** placeholder. Nothing is implemented yet.
