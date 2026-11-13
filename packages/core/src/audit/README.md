# audit

The append-only, hash-chained audit log, security events and the approval requests used for two-person control.

- **Product name:** Platform
- **Brief:** sections 27, 28.3 (`docs/brief/`)
- **Main entities:** audit_events, approval_requests, domain_events (outbox). (Idempotency keys live in `kernel`.)
- **Public interface:** `index.ts`: `recordAudit`, `diffForAudit`, `verifyAuditChain`
- **Jobs and events:** none yet
- **Specs:** `docs/specs/stage-1-time-audit-flags.md`

## Where this module lives

| Layer          | Path                              |
| -------------- | --------------------------------- |
| Use cases      | `packages/core/src/audit/`        |
| Tables and RLS | `packages/db/src/schema/audit.ts` |
| Zod schemas    | `packages/schemas/src/audit.ts`   |

**Status:** the hash-chained audit log is built (`platform.audit_events`, chained by a
database trigger, append-only, verified by `platform.verify_audit_chain()`). Approval
requests and the domain-event outbox come with the features that need them.
