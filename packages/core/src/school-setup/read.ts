// Reading a school's set-up for the Setup screens and for other modules (spec:
// docs/specs/stage-2-school-setup-a.md): the profile, sessions and terms, the calendar,
// classes and arms, subjects, and the checklist. Dates are read as text, so a calendar
// date never passes through the server's own time zone.
import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import { schoolSetup, type time } from "@akoso/domain"
import type {
  CURRICULUM_VERSIONS,
  NON_SCHOOL_DAY_REASONS,
  SCHOOL_TYPES,
  SESSION_STATUSES,
  STAGES,
  STANDARD_CLASS_KEYS,
  SUBJECT_KINDS,
  TRACKS,
} from "@akoso/schemas/school-setup"

import {
  requireTenant,
  schoolToday,
  type RequestContext,
} from "../kernel/index"
import { readSchoolIdentity } from "../tenancy/index"
import { asText, authorizeSetupRead, versionOf } from "./shared"

type LocalDate = time.LocalDate

export interface SchoolProfile {
  name: string
  slug: string
  timeZone: string
  schoolTypes: (typeof SCHOOL_TYPES)[number][]
  motto: string
  address: string
  state: string | null
  lga: string
  phone: string | null
  email: string | null
  brandColour: string | null
  /** Null until the profile step is first saved. */
  version: string | null
}

export interface Term {
  id: string
  number: number
  startsOn: LocalDate
  endsOn: LocalDate
  midTermStartsOn: LocalDate | null
  midTermEndsOn: LocalDate | null
  resumesOn: LocalDate | null
  /** The days school opens in the term. */
  schoolDays: number
}

export interface AcademicSession {
  id: string
  name: string
  startsOn: LocalDate
  endsOn: LocalDate
  status: (typeof SESSION_STATUSES)[number]
  version: string
  terms: Term[]
}

export interface NonSchoolDay {
  id: string
  startsOn: LocalDate
  endsOn: LocalDate
  reason: (typeof NON_SCHOOL_DAY_REASONS)[number]
  note: string
}

export interface Level {
  id: string
  name: string
  stage: (typeof STAGES)[number]
  position: number
}

export interface ClassArm {
  id: string
  classId: string
  name: string
  curriculum: (typeof CURRICULUM_VERSIONS)[number]
  track: (typeof TRACKS)[number] | null
  version: string
  subjectIds: string[]
}

export interface SchoolClass {
  id: string
  levelId: string
  stage: (typeof STAGES)[number]
  name: string
  standardClass: (typeof STANDARD_CLASS_KEYS)[number] | null
  position: number
  version: string
  arms: ClassArm[]
}

export interface Subject {
  id: string
  name: string
  code: string
  kind: (typeof SUBJECT_KINDS)[number]
  nerdcKey: string | null
  archived: boolean
  version: string
}

export const SETUP_STEPS = [
  { key: "profile", title: "School profile" },
  { key: "session", title: "Session and terms" },
  { key: "calendar", title: "Calendar" },
  { key: "classes", title: "Classes and arms" },
  { key: "subjects", title: "Subjects" },
] as const

export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"]
export type StepState = "not_started" | "needs_attention" | "done"

export interface ChecklistStep {
  key: SetupStepKey
  title: string
  state: StepState
  /** Why it needs attention, in plain words; empty otherwise. */
  note: string
}

export interface SchoolSetup {
  profile: SchoolProfile
  sessions: AcademicSession[]
  /** The current session, or null before one is set up. */
  current: AcademicSession | null
  nonSchoolDays: NonSchoolDay[]
  /** Fixed-date holidays in the current session the school hasn't added yet. */
  suggestedHolidays: { date: LocalDate; name: string }[]
  levels: Level[]
  classes: SchoolClass[]
  subjects: Subject[]
  checklist: ChecklistStep[]
  today: LocalDate
}

const text = (value: unknown): string => asText(value)
const optionalText = (value: unknown): string | null =>
  value === null || value === undefined ? null : asText(value)
const date = (value: unknown): LocalDate => asText(value) as LocalDate
const optionalDate = (value: unknown): LocalDate | null =>
  value === null || value === undefined ? null : date(value)

async function readAll(
  tx: TenantTransaction,
  tenantId: string,
  slug: string
): Promise<
  Omit<SchoolSetup, "checklist" | "suggestedHolidays" | "today" | "current">
> {
  const identity = await readSchoolIdentity(tx, tenantId)
  // One query at a time: a transaction has one connection.
  const profileRows = await tx.execute(
    sql`select * from school_setup.school_profiles`
  )
  const sessionRows = await tx.execute(sql`
        select id, name, starts_on::text, ends_on::text, status, updated_at
        from school_setup.academic_sessions order by starts_on desc`)
  const termRows = await tx.execute(sql`
        select id, session_id, number, starts_on::text, ends_on::text,
               mid_term_starts_on::text, mid_term_ends_on::text, resumes_on::text
        from school_setup.terms order by number`)
  const dayRows = await tx.execute(sql`
        select id, starts_on::text, ends_on::text, reason, note
        from school_setup.non_school_days order by starts_on`)
  const levelRows = await tx.execute(sql`
        select id, name, stage, position from school_setup.levels order by position`)
  const classRows = await tx.execute(sql`
        select c.id, c.level_id, l.stage, c.name, c.standard_class, c.position, c.updated_at
        from school_setup.classes c join school_setup.levels l on l.id = c.level_id
        where c.archived_at is null order by l.position, c.position, lower(c.name)`)
  const armRows = await tx.execute(sql`
        select id, class_id, name, curriculum, track, updated_at
        from school_setup.class_arms where archived_at is null order by lower(name)`)
  const linkRows = await tx.execute(
    sql`select arm_id, subject_id from school_setup.arm_subjects`
  )
  const subjectRows = await tx.execute(sql`
        select id, name, code, kind, nerdc_key, archived_at, updated_at
        from school_setup.subjects order by archived_at nulls first, lower(name)`)

  const profileRow = profileRows.rows[0]
  const profile: SchoolProfile = {
    name: identity.name,
    slug,
    timeZone: identity.timeZone,
    schoolTypes: Array.isArray(profileRow?.school_types)
      ? (profileRow.school_types as SchoolProfile["schoolTypes"])
      : [],
    motto: text(profileRow?.motto),
    address: text(profileRow?.address),
    state: optionalText(profileRow?.state),
    lga: text(profileRow?.lga),
    phone: optionalText(profileRow?.phone),
    email: optionalText(profileRow?.email),
    brandColour: optionalText(profileRow?.brand_colour),
    version: profileRow === undefined ? null : versionOf(profileRow.updated_at),
  }

  const nonSchoolDays: NonSchoolDay[] = dayRows.rows.map((row) => ({
    id: text(row.id),
    startsOn: date(row.starts_on),
    endsOn: date(row.ends_on),
    reason: text(row.reason) as NonSchoolDay["reason"],
    note: text(row.note),
  }))

  const sessions: AcademicSession[] = sessionRows.rows.map((row) => {
    const terms = termRows.rows
      .filter((term) => term.session_id === row.id)
      .map((term): Term => {
        const dates = {
          startsOn: date(term.starts_on),
          endsOn: date(term.ends_on),
          midTerm:
            term.mid_term_starts_on === null || term.mid_term_ends_on === null
              ? null
              : {
                  startsOn: date(term.mid_term_starts_on),
                  endsOn: date(term.mid_term_ends_on),
                },
        }
        return {
          id: text(term.id),
          number: Number(term.number),
          startsOn: dates.startsOn,
          endsOn: dates.endsOn,
          midTermStartsOn: optionalDate(term.mid_term_starts_on),
          midTermEndsOn: optionalDate(term.mid_term_ends_on),
          resumesOn: optionalDate(term.resumes_on),
          schoolDays: schoolSetup.countSchoolDays(dates, nonSchoolDays),
        }
      })
    return {
      id: text(row.id),
      name: text(row.name),
      startsOn: date(row.starts_on),
      endsOn: date(row.ends_on),
      status: text(row.status) as AcademicSession["status"],
      version: versionOf(row.updated_at),
      terms,
    }
  })

  const subjectsByArm = new Map<string, string[]>()
  for (const link of linkRows.rows) {
    const list = subjectsByArm.get(text(link.arm_id)) ?? []
    list.push(text(link.subject_id))
    subjectsByArm.set(text(link.arm_id), list)
  }
  const arms: ClassArm[] = armRows.rows.map((row) => ({
    id: text(row.id),
    classId: text(row.class_id),
    name: text(row.name),
    curriculum: text(row.curriculum) as ClassArm["curriculum"],
    track: optionalText(row.track) as ClassArm["track"],
    version: versionOf(row.updated_at),
    subjectIds: subjectsByArm.get(text(row.id)) ?? [],
  }))

  return {
    profile,
    sessions,
    nonSchoolDays,
    levels: levelRows.rows.map((row) => ({
      id: text(row.id),
      name: text(row.name),
      stage: text(row.stage) as Level["stage"],
      position: Number(row.position),
    })),
    classes: classRows.rows.map((row) => ({
      id: text(row.id),
      levelId: text(row.level_id),
      stage: text(row.stage) as SchoolClass["stage"],
      name: text(row.name),
      standardClass: optionalText(
        row.standard_class
      ) as SchoolClass["standardClass"],
      position: Number(row.position),
      version: versionOf(row.updated_at),
      arms: arms.filter((arm) => arm.classId === row.id),
    })),
    subjects: subjectRows.rows.map((row) => ({
      id: text(row.id),
      name: text(row.name),
      code: text(row.code),
      kind: text(row.kind) as Subject["kind"],
      nerdcKey: optionalText(row.nerdc_key),
      archived: row.archived_at !== null,
      version: versionOf(row.updated_at),
    })),
  }
}

/** Each step's state, from what the school has set up (spec, section 1). */
export function checklistFor(
  setup: Pick<SchoolSetup, "profile" | "current" | "nonSchoolDays" | "classes">
): ChecklistStep[] {
  const steps: Record<SetupStepKey, { state: StepState; note: string }> = {
    profile: { state: "not_started", note: "" },
    session: { state: "not_started", note: "" },
    calendar: { state: "not_started", note: "" },
    classes: { state: "not_started", note: "" },
    subjects: { state: "not_started", note: "" },
  }
  const { profile, current, classes } = setup

  if (profile.version !== null) {
    steps.profile =
      profile.address === "" || profile.phone === null
        ? {
            state: "needs_attention",
            note: "Add the school's address and phone number.",
          }
        : { state: "done", note: "" }
  }

  if (current !== null) {
    const problems = schoolSetup.termProblems(
      current.terms.map((term) => ({
        number: term.number,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        midTerm:
          term.midTermStartsOn === null || term.midTermEndsOn === null
            ? null
            : { startsOn: term.midTermStartsOn, endsOn: term.midTermEndsOn },
        resumesOn: term.resumesOn,
      }))
    )
    steps.session =
      current.terms.length < 3
        ? {
            state: "needs_attention",
            note: "Add the dates of all three terms.",
          }
        : problems.length > 0
          ? { state: "needs_attention", note: problems[0]?.message ?? "" }
          : { state: "done", note: "" }

    const inSession = setup.nonSchoolDays.some(
      (day) => day.endsOn >= current.startsOn && day.startsOn <= current.endsOn
    )
    steps.calendar = inSession
      ? { state: "done", note: "" }
      : { state: "not_started", note: "" }
  }

  if (classes.length > 0) {
    const empty = classes.find((entry) => entry.arms.length === 0)
    steps.classes =
      empty === undefined
        ? { state: "done", note: "" }
        : { state: "needs_attention", note: `${empty.name} has no arms.` }

    const arms = classes.flatMap((entry) =>
      entry.arms.map((arm) => ({ arm, entry }))
    )
    const anySubjects = arms.some(({ arm }) => arm.subjectIds.length > 0)
    const bare = arms.find(({ arm }) => arm.subjectIds.length === 0)
    steps.subjects = !anySubjects
      ? { state: "not_started", note: "" }
      : bare === undefined
        ? { state: "done", note: "" }
        : {
            state: "needs_attention",
            note: `${bare.entry.name} ${bare.arm.name} has no subjects.`,
          }
  }

  return SETUP_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    ...steps[step.key],
  }))
}

/** Everything the Setup screens show, for staff who may read the set-up. */
export async function getSchoolSetup(
  ctx: RequestContext
): Promise<SchoolSetup> {
  authorizeSetupRead(ctx)
  const tenantId = requireTenant(ctx)
  const slug = ctx.school?.slug ?? ""
  const data = await withTenant(ctx.db, tenantId, (tx) =>
    readAll(tx, tenantId, slug)
  )
  const current =
    data.sessions.find((session) => session.status === "current") ?? null
  const taken = new Set(
    data.nonSchoolDays.flatMap((day) =>
      day.startsOn === day.endsOn ? [day.startsOn] : []
    )
  )
  const suggestedHolidays =
    current === null
      ? []
      : schoolSetup
          .fixedHolidays({ startsOn: current.startsOn, endsOn: current.endsOn })
          .filter(
            (holiday) =>
              !taken.has(holiday.date) &&
              !data.nonSchoolDays.some(
                (day) =>
                  day.startsOn <= holiday.date && day.endsOn >= holiday.date
              )
          )
  return {
    ...data,
    current,
    suggestedHolidays,
    checklist: checklistFor({ ...data, current }),
    today: schoolToday(ctx),
  }
}

/**
 * Whether the school opens on a date (spec, section 4): for attendance (days opened)
 * and messaging (no reminders on days off). Any signed-in member of the school may ask;
 * the answer reveals nothing but yes or no.
 */
export async function isSchoolDay(
  ctx: RequestContext,
  day: LocalDate
): Promise<boolean> {
  const tenantId = requireTenant(ctx)
  return withTenant(ctx.db, tenantId, async (tx) => {
    const terms = await tx.execute(sql`
      select starts_on::text, ends_on::text, mid_term_starts_on::text, mid_term_ends_on::text
      from school_setup.terms where starts_on <= ${day}::date and ends_on >= ${day}::date`)
    const days = await tx.execute(sql`
      select starts_on::text, ends_on::text from school_setup.non_school_days
      where starts_on <= ${day}::date and ends_on >= ${day}::date`)
    return schoolSetup.isSchoolDay(
      day,
      terms.rows.map((row) => ({
        startsOn: date(row.starts_on),
        endsOn: date(row.ends_on),
        midTerm:
          row.mid_term_starts_on === null || row.mid_term_ends_on === null
            ? null
            : {
                startsOn: date(row.mid_term_starts_on),
                endsOn: date(row.mid_term_ends_on),
              },
      })),
      days.rows.map((row) => ({
        startsOn: date(row.starts_on),
        endsOn: date(row.ends_on),
      }))
    )
  })
}
