# School setup, part A: profile, calendar, classes and subjects

- **Status:** Approved (founder, 14/11/2026), with all five recommendations: section 8 in three parts; NERDC lists researched with cited sources and checked by the founder before they ship; only fixed-date holidays suggested; slug changes through Akoso support; form teachers once staff records exist
- **Module:** `school-setup` (`packages/core/src/school-setup`, `packages/db/src/schema/school-setup.ts`, `packages/schemas/src/school-setup.ts`), `packages/domain/src/school-setup` (presets, school-day counting), `tenancy` (school name and time zone), `apps/web` (the Setup screens under `/{school}/setup`) · **Brief:** section 8 (steps 1 to 4), 3.1, 9 · **Stage:** 2
- **Estimate:** 40 hours of agent time
- **No new dependencies.**

## Why now, and why in parts

Every Stage 2 and Stage 3 screen needs the school's skeleton: its sessions and terms,
classes and arms, and subjects. Students are enrolled into arms; results are entered per
subject and term; attendance counts the days the school opened.

Brief section 8 has eleven setup steps. I propose three pieces (open question 1):

| Piece                          | Brief steps                                                                                | When                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **Part A** (this spec)         | 1 (profile, without logo and signatures), 2, 3, 4                                          | Now                                                 |
| **Part B**                     | 5 to 9: assessment and grading schemes, positions, traits, the nursery rubric              | Next, before Stage 3 needs them                     |
| **File storage**, its own spec | 1's logo and the principal's and head teacher's signatures (also imports and report cards) | Before Part B, because report cards need signatures |
| With their own items           | 10 (fees and the settlement account, Stage 4); 11 (staff invitations, the staff item)      | Later                                               |

## User stories

- As a **proprietor**, I set up my school in one sitting: profile, this session's terms
  and holidays, classes and arms, and subjects from the NERDC lists, adjusting what I
  need.
- As a **head teacher**, I know Primary 4 can follow the 2025 curriculum while Primary 6
  stays on the old one, in the same session.
- As the **founder**, I know no calendar, class list or subject list is hard-coded: each
  school's set-up is its own data.

## What it does

### 1. The Setup screens and the wizard

- **Setup** is a new item in the staff navigation (`/{school}/setup`), for people with
  `setup.school.manage`.
- **A checklist page** shows each step with its state (not started, needs attention,
  done) and opens each one. A new school is walked through them in order; afterwards each
  step stays editable on its own.
- **Steps:**
  1. School profile
  2. Session and terms
  3. Calendar
  4. Classes and arms
  5. Subjects

  Part B's steps join the checklist when built.

- **Defaults keep it fast** (the brief's 45 minutes):
  - classes from the school type (a primary school gets Primary 1 to 6 and one arm "A"
    each)
  - subjects from the NERDC lists for each class and curriculum version
  - common fixed public holidays suggested for the school to confirm

  The school then removes, renames or adds.

- **Every change is saved as it is made** and recorded in the audit log. There is no
  "submit at the end" that could lose 30 minutes of work on a dropped connection.

### 2. School profile (brief step 1)

- **Kept on the school:**
  - name
  - school type: nursery, primary, secondary, or combined (a set of these)
  - motto
  - address
  - state and LGA (from a list)
  - phone (+234 format)
  - email
  - time zone (default Africa/Lagos)
  - brand colour, checked for contrast before it's accepted (brief 4.1: a scoped
    `--brand` variable, never a preset token)
- **The name and time zone** stay on `platform.tenants`. The tenancy module changes them,
  on the school's request, through a use case.
- **The address slug** (`greenfield`) isn't editable here: it's printed on flyers and QR
  codes. Akoso support changes it on request (open question 4).
- **Logo and signatures** wait for file storage (see the table above). Until then, the
  frame shows the initials.

### 3. Session and terms (brief step 2)

- **A session** has a name (`2027/2028`) and three terms.
- **Each term** has:
  - a start and an end date
  - mid-term break dates (start and end; optional)
  - the next term's resumption date
- **Rules** (errors explain what to fix, in the brand voice):
  - terms don't overlap, and run in order
  - the mid-term break sits inside its term
  - resumption comes after the term ends
  - dates are plain calendar dates in the school's time zone (item 6's `LocalDate`)
- **One session is current.** The next one can be prepared ahead. A closed session
  becomes read-only here; rollover is its own Stage 2 item.
- **No state calendar is built in** (brief 8): each school enters and confirms its own
  dates.

### 4. The school calendar (brief step 2)

- **Non-school days:** public holidays, unplanned closures and other days off, each with a
  date (or a range), a reason and an optional note. Mid-term breaks come from the term
  dates.
- **Suggested holidays:** the fixed-date national holidays are offered for the school to
  confirm (New Year's Day, Workers' Day, Democracy Day, Independence Day, Christmas and
  Boxing Day), for the session's dates.
  - Holidays that move (Easter, Eid el-Fitr, Eid el-Kabir, Maulud) are announced late,
    so the school adds them when they're declared.
  - Nothing is added without the school confirming it (open question 3).
- **School days:** a pure function in `packages/domain` counts the days the school
  opened: weekdays in the term, minus the mid-term break and non-school days.
  `isSchoolDay(ctx, date)` answers for a school, so attendance (days opened) and messaging
  (no reminders on days off) can rely on it later.

### 5. Classes and arms (brief step 3)

- **Levels** are the school's sections, used later for schemes per level (Part B):
  Nursery, Primary, Junior secondary, Senior secondary.
- **Classes** sit in a level, in order: Pre-nursery, Nursery 1 and 2, Reception or KG,
  Primary 1 to 6, JSS 1 to 3, SSS 1 to 3. The school can rename classes and add its own
  (for example "Basic 7" naming).
  - Each class records which **standard class** it is (for example Primary 4), so the
    NERDC presets and subject limits apply whatever the school calls it.
- **Arms** belong to a class: letters or names (A, B; Gold, Diamond). Each arm records:
  - its **curriculum version:** pre-2025 NERDC, 2025 revised NERDC, or the school's own
    (international curricula, for example)
  - its **SSS track,** for senior arms: Science, Humanities, Business, or none
  - its **form teacher:** the field exists now and is filled in when staff records exist
    (the staff item; open question 5)
- **Removing a class or arm** that students or results use is refused later; it can be
  archived instead. In this part nothing uses them yet, so removal is allowed with a
  confirmation.

### 6. Subjects (brief step 4)

- **The school's subject list:** name, short code (`MTH`), kind (core, elective, trade),
  and optionally the NERDC subject it corresponds to.
- **Each arm's subjects:** chosen from the school's list. The checklist step pre-fills
  each arm from the NERDC preset for its standard class, track and curriculum version.
- **Presets** for both the pre-2025 NERDC lists and the 2025 revised curriculum, stored as
  versioned data in `packages/domain/src/school-setup/` (open question 2: their source).
  The 2025 curriculum is phased in by cohort from September 2025 (Primary 1, Primary 4,
  JSS 1 and SS 1 first), which is why the version sits on each arm.
- **Subject limits for 2025 arms** are kept as data, and the screen **warns, never
  blocks**, outside them:

  | Classes     | Subjects |
  | ----------- | -------- |
  | Primary 1–3 | 9–10     |
  | Primary 4–6 | 10–12    |
  | JSS         | 12–14    |
  | SSS         | 8–9      |

- **Renaming a subject** keeps its identity, so later results stay linked.
- **Removing a subject** that results will use is refused once results exist (Stage 3);
  archiving hides it from new arms.

### 7. Who does what

| Action key            | Roles                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| `setup.school.read`   | Every staff role: classes, arms, subjects and the calendar are needed on many screens |
| `setup.school.manage` | `proprietor`, `school_admin`                                                          |

Both can go into custom roles (for example an Exams officer who manages subjects).

## Data changes

All new tables are school tables: forced row-level security, isolation fixtures, and
unique rules that start with `tenant_id`.

| Table                            | Notes                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `school_setup.school_profiles`   | One row per school: type, motto, address, state, LGA, phone, email, brand colour                        |
| `school_setup.academic_sessions` | Name, start and end, status (planned, current, closed); one current per school                          |
| `school_setup.terms`             | Session, number (1–3), start, end, mid-term start and end, resumption; checks for order and containment |
| `school_setup.non_school_days`   | Date range, reason, note, term                                                                          |
| `school_setup.levels`            | Name, stage (nursery, primary, junior, senior), order                                                   |
| `school_setup.classes`           | Level, name, standard class (for example `primary_4`), order, archived                                  |
| `school_setup.class_arms`        | Class, name, curriculum version, track, form teacher (membership, nullable), archived                   |
| `school_setup.subjects`          | Name, code, kind, NERDC key (nullable), archived                                                        |
| `school_setup.arm_subjects`      | Arm, subject                                                                                            |

- **A new `school_setup` Postgres schema** keeps these apart from `platform`, as the
  architecture's module-per-schema plan says. The isolation suite already covers every
  schema.
- **States and LGAs** are a fixed list in `packages/domain` (37 states with their LGAs),
  not a table.
- **Dates** are `date` columns, never timestamps.

## Edge cases

- **A combined school** (nursery to SSS) gets all four levels. A secondary-only school
  gets JSS and SSS.
- **A school on an international curriculum:** arms set to "the school's own" get no
  presets and no limit warnings.
- **A term that spans a holiday at a weekend:** non-school days on weekends don't change
  the count.
- **A session's last term:** its resumption date is the next session's first day. The
  next session can be created then.
- **Two people editing the same step:** each change is saved alone. A change based on an
  older version answers "changed by someone else, please refresh" (item 3's conflict
  error).
- **Slow connections:** each save is small. The screens work on a phone, though
  proprietors usually set up on a computer.

## Threat model (STRIDE)

| Threat                     | Example                                               | Mitigation                                                                                                         |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Someone without the role changing the school's set-up | `setup.school.manage` on every change, checked on the server; the frame only hides the link                        |
| **Tampering**              | Dates or IDs from another school in a request         | Row-level security on every table; IDs looked up within the school; strict input schemas; database checks on dates |
| **Repudiation**            | "Who moved the term dates?"                           | Every change is in the school's audit log                                                                          |
| **Information disclosure** | One school seeing another's classes                   | Forced row-level security and the isolation suite                                                                  |
| **Denial of service**      | Thousands of arms or subjects created by a script     | Write rate limits (item 3), and caps per school (200 classes, 1,000 arms, 500 subjects)                            |
| **Elevation of privilege** | A teacher renaming subjects                           | Only `setup.school.manage`, or a custom role the proprietor made                                                   |

## Acceptance criteria

1. **The checklist:** a new school's proprietor sees five steps, each with its state. A
   teacher has no Setup item, and a direct visit answers 404.
2. **Defaults:** choosing "primary" creates Primary 1 to 6 with arm A, and each arm gets
   the NERDC preset for its version.
3. **Brief's acceptance line:** Primary 4 runs the 2025 list and Primary 6 the pre-2025
   list in the same session, each with its own subjects.
4. **Limits:** a 2025 Primary 4 arm with 13 subjects shows a warning and still saves.
5. **Dates:**
   - overlapping terms, a mid-term outside its term, and a resumption before the term
     ends are each refused with a clear message
   - the school-day count for a test term matches a hand count
6. **Holidays:** suggested fixed holidays are added only when confirmed; non-school days
   reduce the count.
7. **Isolation:** every new table is in the isolation suite.
8. **Audit:** each change writes one audit record with what changed.
9. **Timing:** an end-to-end test sets up a primary school with defaults through the
   screens. On a real school, you time it with a pilot (the brief's 45 minutes).
10. **Accessibility:** axe passes on every Setup screen, light and dark.

## Out of scope

- The logo and signatures (file storage).
- Assessment and grading schemes, positions, traits, the nursery rubric (part B).
- Fees and the settlement account (Stage 4).
- Staff invitations and form-teacher assignment (the staff item).
- Rollover to the next session (its own Stage 2 item).

## Open questions

1. **Split section 8** as in the table: part A now, then file storage, then part B. I
   recommend this. One spec for all eleven steps would be too large to review.
2. **Where the NERDC subject lists come from.** I recommend I research the published
   pre-2025 and 2025 revised NERDC lists, cite each source in the data file, and you (or a
   head teacher you trust) check them before they ship. They're data, so a correction
   later is one file. I won't invent lists I can't source; anything uncertain is marked
   for you to confirm.
3. **Suggested holidays:** only the fixed-date national holidays, each confirmed by the
   school. Moving holidays are left to the school. I recommend this, so a wrong guess about
   a declared date never reaches parents' reminders.
4. **The address slug** changes only through Akoso support, because it's printed on
   flyers and QR codes. I recommend this.
5. **Form teachers** are assigned when staff records exist. The field is ready now, empty.
   I recommend this rather than inviting staff from inside setup now.

## Notes from building it

Where the build differs from the text above, and why. Each is in `docs/decisions.md`.

- **Primary 4 to 6 limit:** 11 to 13 subjects, as NERDC's 2025 offering states, not the
  10 to 12 in the table above (D-OPEN-8, item 3).
- **LGAs are typed** for now; states are a fixed list (D-OPEN-8, item 4).
- **Removing** a class, arm or subject archives it (A-20).
- **Default curriculum per arm** follows NERDC's cohort phase-in (A-22).
- **The brand colour** must reach 4.5:1 against white (A-23).
- **A combined school** gets all four levels; a secondary school gets JSS and SSS, as
  in the edge cases. Every school also gets Pre-nursery to Reception when it teaches
  nursery.
