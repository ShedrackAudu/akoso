// Inputs for the school-setup module's server actions (spec:
// docs/specs/stage-2-school-setup-a.md). Shared by the use cases and the screens, so
// both check the same rules. The lists of kinds live here; packages/domain holds the
// data behind them (presets, limits, labels).
import { z } from "zod"

/** What a school teaches; a combined school has more than one. */
export const SCHOOL_TYPES = ["nursery", "primary", "secondary"] as const

export const STAGES = ["nursery", "primary", "junior", "senior"] as const

export const STANDARD_CLASS_KEYS = [
  "pre_nursery",
  "nursery_1",
  "nursery_2",
  "reception",
  "primary_1",
  "primary_2",
  "primary_3",
  "primary_4",
  "primary_5",
  "primary_6",
  "jss_1",
  "jss_2",
  "jss_3",
  "sss_1",
  "sss_2",
  "sss_3",
] as const

export const CURRICULUM_VERSIONS = [
  "nerdc_2025",
  "nerdc_pre2025",
  "own",
] as const

/** Senior secondary fields of study. Technology exists only before 2025. */
export const TRACKS = [
  "science",
  "humanities",
  "business",
  "technology",
] as const

export const SUBJECT_KINDS = ["core", "elective", "trade", "optional"] as const

export const NON_SCHOOL_DAY_REASONS = [
  "public_holiday",
  "closure",
  "other",
] as const

export const SESSION_STATUSES = ["planned", "current", "closed"] as const

/** Caps per school (spec, threat model: denial of service). */
export const SETUP_LIMITS = {
  classes: 200,
  arms: 1000,
  subjects: 500,
  nonSchoolDays: 400,
} as const

/** The school a school-scoped action is for: its slug, as in the page's address. */
const schoolSlugSchema = z.string().min(1).max(63)

/** A calendar date, "YYYY-MM-DD". */
const dateSchema = z.iso.date("Enter a date")

const optionalDate = dateSchema.nullable().default(null)

/**
 * The row's version as the screen last saw it (its updated_at). A save based on an
 * older version is refused as a conflict (spec, edge cases: two people editing).
 */
const versionSchema = z.iso.datetime({ offset: true }).optional()

const name = (max: number, what: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${what}`)
    .max(max, `Use ${String(max)} characters or fewer`)

// The school profile (section 2).

export const saveProfileInput = z.object({
  school: schoolSlugSchema,
  name: name(200, "the school's name"),
  timeZone: z.string().trim().min(1).max(64).default("Africa/Lagos"),
  schoolTypes: z
    .array(z.enum(SCHOOL_TYPES))
    .min(1, "Choose what the school teaches")
    .max(3),
  motto: z.string().trim().max(200, "Use 200 characters or fewer").default(""),
  address: z
    .string()
    .trim()
    .max(500, "Use 500 characters or fewer")
    .default(""),
  state: z.string().trim().max(40).nullable().default(null),
  lga: z.string().trim().max(100, "Use 100 characters or fewer").default(""),
  /** As typed; the server normalises it to +234 form. */
  phone: z.string().trim().max(20).default(""),
  email: z
    .union([
      z.literal(""),
      z.email("Enter an email address like name@school.ng"),
    ])
    .default(""),
  /** "#rrggbb", or empty for Akoso's own colour. */
  brandColour: z.string().trim().max(7).default(""),
  version: versionSchema,
})

// Sessions and terms (section 3).

export const saveSessionInput = z.object({
  school: schoolSlugSchema,
  /** Absent for a new session. */
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Write the session like 2026/2027"),
  startsOn: dateSchema,
  endsOn: dateSchema,
  version: versionSchema,
})

export const sessionRefInput = z.object({
  school: schoolSlugSchema,
  sessionId: z.uuid(),
})

const termInput = z.object({
  number: z.number().int().min(1).max(3),
  startsOn: dateSchema,
  endsOn: dateSchema,
  midTermStartsOn: optionalDate,
  midTermEndsOn: optionalDate,
  resumesOn: optionalDate,
})

/** A session's terms, saved together so the order rules can be checked as a whole. */
export const saveTermsInput = z.object({
  school: schoolSlugSchema,
  sessionId: z.uuid(),
  terms: z.array(termInput).min(1).max(3),
  version: versionSchema,
})

// The calendar (section 4).

export const addNonSchoolDayInput = z.object({
  school: schoolSlugSchema,
  startsOn: dateSchema,
  /** The same as startsOn for a single day. */
  endsOn: dateSchema,
  reason: z.enum(NON_SCHOOL_DAY_REASONS),
  note: z.string().trim().max(200, "Use 200 characters or fewer").default(""),
})

export const nonSchoolDayRefInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid(),
})

/** The suggested fixed holidays the school confirmed. */
export const confirmHolidaysInput = z.object({
  school: schoolSlugSchema,
  holidays: z
    .array(z.object({ date: dateSchema, name: name(60, "the holiday's name") }))
    .min(1, "Choose at least one holiday")
    .max(20),
})

// Classes and arms (section 5).

export const createDefaultClassesInput = z.object({
  school: schoolSlugSchema,
})

export const saveClassInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid().optional(),
  stage: z.enum(STAGES),
  name: name(60, "the class's name"),
  standardClass: z.enum(STANDARD_CLASS_KEYS).nullable().default(null),
  version: versionSchema,
})

export const saveArmInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid().optional(),
  classId: z.uuid(),
  name: name(40, "the arm's name"),
  curriculum: z.enum(CURRICULUM_VERSIONS),
  track: z.enum(TRACKS).nullable().default(null),
  version: versionSchema,
})

export const setupRefInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid(),
})

/** Moves a class one place up or down within its level. */
export const moveClassInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
})

// Subjects (section 6).

export const saveSubjectInput = z.object({
  school: schoolSlugSchema,
  id: z.uuid().optional(),
  name: name(80, "the subject's name"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, "Use 2 to 8 letters or digits, like MTH"),
  kind: z.enum(SUBJECT_KINDS),
  nerdcKey: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(60)
    .nullable()
    .default(null),
  version: versionSchema,
})

export const setArmSubjectsInput = z.object({
  school: schoolSlugSchema,
  armId: z.uuid(),
  subjectIds: z.array(z.uuid()).max(40, "An arm can take at most 40 subjects"),
})

/** Fills every arm that has no subjects yet from its NERDC preset. */
export const applySubjectPresetsInput = z.object({
  school: schoolSlugSchema,
})
