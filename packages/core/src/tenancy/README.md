# tenancy

Schools (tenants) and groups (a branch is a school in a group), school addresses and custom domains, per-school feature flags and platform settings.

- **Product name:** Platform
- **Brief:** sections 7, 7.1 (`docs/brief/`)
- **Main entities:** groups, tenants, tenant_domains, tenant_feature_flags (built). Platform settings live in the kernel
- **Public interface:** `index.ts`: host classification, school lookups (by slug, ID or custom host) and a small cache
- **Jobs and events:** none yet
- **Specs:** `docs/specs/stage-1-tenancy.md`, `docs/specs/stage-1-time-audit-flags.md` (flags)

## Where this module lives

| Layer          | Path                                |
| -------------- | ----------------------------------- |
| Use cases      | `packages/core/src/tenancy/`        |
| Tables and RLS | `packages/db/src/schema/tenancy.ts` |
| Zod schemas    | `packages/schemas/src/tenancy.ts`   |

**Status:** schools, groups, the lookups and the address rules are built. Creating and
changing schools are platform-admin screens (Stage 5); custom-domain verification is its
own slice.
