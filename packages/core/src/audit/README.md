# audit

The append-only, hash-chained audit log, security events and the approval requests used for two-person control.

- **Product name:** Platform
- **Brief:** sections 27, 28.3 (`docs/brief/`)
- **Main entities:** audit_events, approval_requests, domain_events (outbox), idempotency_keys
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                              |
| -------------- | --------------------------------- |
| Use cases      | `packages/core/src/audit/`        |
| Tables and RLS | `packages/db/src/schema/audit.ts` |
| Zod schemas    | `packages/schemas/src/audit.ts`   |

**Status:** placeholder. Nothing is implemented yet.
