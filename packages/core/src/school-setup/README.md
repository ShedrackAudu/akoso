# school-setup

The school's skeleton: its profile, sessions and terms, the calendar, levels, classes
and arms, and subjects. Part B adds assessment and grading schemes, positions, traits
and the nursery rubric.

- **Product name:** Setup (`/{school}/setup`)
- **Brief:** section 8 (`docs/brief/`)
- **Spec:** `docs/specs/stage-2-school-setup-a.md` (part A, approved, D-35)
- **Permissions:** `setup.school.read` (every staff role), `setup.school.manage`
  (proprietor and school administrator; both can go into custom roles)
- **Jobs and events:** none yet

## Public interface (`index.ts`)

| Use case                                                                                | Step                                                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `getSchoolSetup`                                                                        | All: what the screens show, and the checklist            |
| `isSchoolDay(ctx, date)`                                                                | For attendance and messaging later                       |
| `saveSchoolProfile`                                                                     | 1. Profile (the name and time zone go through `tenancy`) |
| `saveSession`, `makeSessionCurrent`, `saveTerms`                                        | 2. Session and terms                                     |
| `addNonSchoolDay`, `removeNonSchoolDay`, `confirmHolidays`                              | 3. Calendar                                              |
| `createDefaultClasses`, `saveClass`, `moveClass`, `removeClass`, `saveArm`, `removeArm` | 4. Classes and arms                                      |
| `saveSubject`, `archiveSubject`, `setArmSubjects`, `applySubjectPresets`                | 5. Subjects                                              |

Every change checks `setup.school.manage`, runs in one `withTenant()` transaction and
writes an audit record. A save that sends `version` (the row's `updated_at` as the
screen saw it) is refused as a conflict when someone else changed the row since.

## Rules worth knowing

- **Dates are calendar dates.** Columns are `date`, and are always read as text
  (`starts_on::text`), so a date never passes through the server's time zone.
- **Nothing is hard-deleted** except days off and an arm's subject choices. Removing a
  class, arm or subject archives it (A-20).
- **Caps per school:** 200 classes, 1,000 arms, 500 subjects, 400 days off
  (`SETUP_LIMITS` in `packages/schemas/src/school-setup.ts`).
- **The NERDC presets and limits** are data in `packages/domain/src/school-setup/`,
  with their sources cited. Some items wait for the founder's check (D-OPEN-8).
- **Subject limits warn, never block:** `setArmSubjects` saves and returns a warning.

## Where this module lives

| Layer          | Path                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| Use cases      | `packages/core/src/school-setup/`                                              |
| Pure rules     | `packages/domain/src/school-setup/`                                            |
| Tables and RLS | `packages/db/src/schema/school-setup.ts`, migrations 0015 and 0016             |
| Zod schemas    | `packages/schemas/src/school-setup.ts`                                         |
| Screens        | `apps/web/app/(app)/[school]/(staff)/setup/`, `apps/web/features/staff/setup/` |

**Status:** part A built. Part B, file storage (logo and signatures) and rollover come
later.
