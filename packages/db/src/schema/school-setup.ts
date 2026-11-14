// School setup, part A (spec: docs/specs/stage-2-school-setup-a.md): the school's
// profile, sessions and terms, calendar, levels, classes, arms and subjects. Every table
// belongs to one school: row-level security, checks and grants are in the hand-written
// migration. Child rows reference their parent with (tenant_id, id), so a row can never
// point at another school's parent. Part B (schemes, traits) adds to this file.
import {
  date,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { tenants } from "./tenancy"

export const schoolSetup = pgSchema("school_setup")

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow()
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
const tenantId = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id)

/** One per school: what part A's profile step records beyond name and time zone. */
export const schoolProfiles = schoolSetup.table("school_profiles", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id),
  /** Any of nursery, primary, secondary; more than one is a combined school. */
  schoolTypes: text("school_types").array().notNull(),
  motto: text("motto").notNull().default(""),
  address: text("address").notNull().default(""),
  state: text("state"),
  lga: text("lga").notNull().default(""),
  /** E.164. */
  phone: text("phone"),
  email: text("email"),
  /** #rrggbb, checked for contrast before it is accepted. */
  brandColour: text("brand_colour"),
  createdAt,
  updatedAt,
})

export const academicSessions = schoolSetup.table(
  "academic_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    /** "2026/2027". */
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** planned, current or closed. */
    status: text("status").notNull().default("planned"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("academic_sessions_tenant_id_unique").on(table.tenantId, table.id),
    unique("academic_sessions_tenant_name_unique").on(
      table.tenantId,
      table.name
    ),
  ]
)

export const terms = schoolSetup.table(
  "terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    sessionId: uuid("session_id").notNull(),
    number: smallint("number").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    midTermStartsOn: date("mid_term_starts_on"),
    midTermEndsOn: date("mid_term_ends_on"),
    resumesOn: date("resumes_on"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("terms_tenant_session_number_unique").on(
      table.tenantId,
      table.sessionId,
      table.number
    ),
    foreignKey({
      name: "terms_session_fk",
      columns: [table.tenantId, table.sessionId],
      foreignColumns: [academicSessions.tenantId, academicSessions.id],
    }).onDelete("cascade"),
  ]
)

/** Public holidays, closures and other days off. Mid-term breaks live on the term. */
export const nonSchoolDays = schoolSetup.table(
  "non_school_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** public_holiday, closure or other. */
    reason: text("reason").notNull(),
    note: text("note").notNull().default(""),
    createdAt,
  },
  (table) => [
    index("non_school_days_tenant_starts_idx").on(
      table.tenantId,
      table.startsOn
    ),
  ]
)

/** The school's sections: nursery, primary, junior and senior secondary. */
export const levels = schoolSetup.table(
  "levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    /** nursery, primary, junior or senior. */
    stage: text("stage").notNull(),
    position: integer("position").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("levels_tenant_id_unique").on(table.tenantId, table.id),
    unique("levels_tenant_stage_unique").on(table.tenantId, table.stage),
  ]
)

export const classes = schoolSetup.table(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    levelId: uuid("level_id").notNull(),
    name: text("name").notNull(),
    /** Which standard class this is (primary_4), so presets apply; null if none. */
    standardClass: text("standard_class"),
    position: integer("position").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("classes_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "classes_level_fk",
      columns: [table.tenantId, table.levelId],
      foreignColumns: [levels.tenantId, levels.id],
    }),
    index("classes_tenant_level_idx").on(table.tenantId, table.levelId),
  ]
)

export const classArms = schoolSetup.table(
  "class_arms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    classId: uuid("class_id").notNull(),
    name: text("name").notNull(),
    /** nerdc_2025, nerdc_pre2025 or own. */
    curriculum: text("curriculum").notNull(),
    /** Senior secondary field: science, humanities, business, technology; or null. */
    track: text("track"),
    /** The form teacher's membership, once staff records exist (spec question 5). */
    formTeacherMembershipId: uuid("form_teacher_membership_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("class_arms_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "class_arms_class_fk",
      columns: [table.tenantId, table.classId],
      foreignColumns: [classes.tenantId, classes.id],
    }).onDelete("cascade"),
    index("class_arms_tenant_class_idx").on(table.tenantId, table.classId),
  ]
)

export const subjects = schoolSetup.table(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    /** core, elective, trade or optional. */
    kind: text("kind").notNull(),
    /** The NERDC subject it corresponds to (packages/domain), if any. */
    nerdcKey: text("nerdc_key"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("subjects_tenant_id_unique").on(table.tenantId, table.id),
    unique("subjects_tenant_code_unique").on(table.tenantId, table.code),
  ]
)

/** Which subjects each arm takes. */
export const armSubjects = schoolSetup.table(
  "arm_subjects",
  {
    tenantId: tenantId(),
    armId: uuid("arm_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.armId, table.subjectId] }),
    foreignKey({
      name: "arm_subjects_arm_fk",
      columns: [table.tenantId, table.armId],
      foreignColumns: [classArms.tenantId, classArms.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "arm_subjects_subject_fk",
      columns: [table.tenantId, table.subjectId],
      foreignColumns: [subjects.tenantId, subjects.id],
    }).onDelete("cascade"),
    index("arm_subjects_tenant_subject_idx").on(
      table.tenantId,
      table.subjectId
    ),
  ]
)
