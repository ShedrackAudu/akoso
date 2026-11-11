# offline-sync

The server side of offline work: accepting queued operations, re-validating each one, cell versions and the conflict review list.

- **Product name:** Platform
- **Brief:** section 20 (`docs/brief/`)
- **Main entities:** none of its own yet; it calls results and attendance through their public interfaces
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                     |
| -------------- | ---------------------------------------- |
| Use cases      | `packages/core/src/offline-sync/`        |
| Tables and RLS | `packages/db/src/schema/offline-sync.ts` |
| Zod schemas    | `packages/schemas/src/offline-sync.ts`   |

**Status:** placeholder. Nothing is implemented yet.
