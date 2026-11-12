# kernel

What every module's use cases and every app's routes share: the request context, the
central permission check, the typed errors and their one mapper, structured logging,
cursor pagination, rate limits, idempotent writes and the request pipeline behind every
`/api/v1` route and server action.

- **Product name:** Platform (no screens of its own)
- **Brief:** sections 3.1, 5.1, 28 (`docs/brief/`)
- **Spec:** `docs/specs/stage-1-api-and-service-conventions.md`
- **Main entities:** `platform.idempotency_keys` (tenant table, RLS forced),
  `platform.rate_limit_windows` (unlogged counts, reached only through
  `platform.hit_rate_limit()`)
- **Public interface:** `index.ts`
- **Jobs:** the daily purge of expired idempotency keys
  (`platform.purge_expired_idempotency_keys()`), scheduled when the worker runs pg-boss

## Where this module lives

| Layer          | Path                                                             |
| -------------- | ---------------------------------------------------------------- |
| Use cases      | `packages/core/src/kernel/`                                      |
| Tables and RLS | `packages/db/src/schema/kernel.ts`, `packages/db/migrations/`    |
| Contracts      | `packages/schemas/src/api.ts`, `packages/schemas/src/contracts/` |

`testing.ts` holds test-only helpers (`testContext()`, `memoryLogger()`). It is never
exported from `index.ts`, so production code cannot build a signed-in context without
sign-in.
