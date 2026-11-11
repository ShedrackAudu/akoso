# school-setup

The onboarding wizard: sessions and terms, the school calendar, levels, classes and arms, subjects and curriculum versions, assessment and grading schemes, position settings and traits.

- **Product name:** Setup
- **Brief:** section 8 (`docs/brief/`)
- **Main entities:** academic_sessions, terms, non_school_days, levels, classes, class_arms, curriculum_versions, subjects, class_subjects, assessment_schemes, grading_schemes, traits
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                     |
| -------------- | ---------------------------------------- |
| Use cases      | `packages/core/src/school-setup/`        |
| Tables and RLS | `packages/db/src/schema/school-setup.ts` |
| Zod schemas    | `packages/schemas/src/school-setup.ts`   |

**Status:** placeholder. Nothing is implemented yet.
