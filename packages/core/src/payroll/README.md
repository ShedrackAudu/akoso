# payroll

Salary structures, versioned tax tables, monthly payroll runs, payslips, remittance schedules and the statutory calendar.

- **Product name:** Akoso Staff
- **Brief:** section 15 (`docs/brief/`)
- **Main entities:** salary_structures, payroll_runs, payslips, tax_tables, statutory_deadlines
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                |
| -------------- | ----------------------------------- |
| Use cases      | `packages/core/src/payroll/`        |
| Tables and RLS | `packages/db/src/schema/payroll.ts` |
| Zod schemas    | `packages/schemas/src/payroll.ts`   |

**Status:** placeholder. Nothing is implemented yet.
