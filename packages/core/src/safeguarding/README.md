# safeguarding

Behaviour records, restricted pastoral notes, sick-bay visits, pickup codes, gate checks and early-exit gate passes.

- **Product name:** Akoso Prefect
- **Brief:** section 21 (`docs/brief/`)
- **Main entities:** behaviour_records, sickbay_visits, pickup_codes, pickup_logs
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                     |
| -------------- | ---------------------------------------- |
| Use cases      | `packages/core/src/safeguarding/`        |
| Tables and RLS | `packages/db/src/schema/safeguarding.ts` |
| Zod schemas    | `packages/schemas/src/safeguarding.ts`   |

**Status:** placeholder. Nothing is implemented yet.
