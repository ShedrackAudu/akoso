// Spike 02 only. A made-up school, teacher and class, standing in for the real
// people, structure and sign-in that later slices build. All names are fake.

export const SPIKE_TENANT_ID = "0c000000-0000-4000-8000-00000000000c"
export const SPIKE_TEACHER_ID = "0d000000-0000-4000-8000-00000000000d"

/** The school's time zone, the brief's default (section 3.1). */
export const SPIKE_SCHOOL_TIME_ZONE = "Africa/Lagos"

export const SPIKE_CLASS_NAME = "JSS 2A (spike)"
export const SPIKE_SUBJECT_NAME = "Mathematics"

export interface SpikeComponent {
  key: string
  label: string
  maximum: number
}

/** An assessment scheme that totals 100, with whole-number scores only. */
export const SPIKE_COMPONENTS: readonly SpikeComponent[] = [
  { key: "CA1", label: "CA1", maximum: 20 },
  { key: "CA2", label: "CA2", maximum: 20 },
  { key: "EXAM", label: "Exam", maximum: 60 },
]

export const SPIKE_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
] as const

export type SpikeAttendanceStatus = (typeof SPIKE_ATTENDANCE_STATUSES)[number]

export interface SpikeStudent {
  id: string
  name: string
}

const FIRST_NAMES = [
  "Ada",
  "Bola",
  "Chidi",
  "Dayo",
  "Emeka",
  "Funke",
  "Gbenga",
  "Halima",
  "Ifeoma",
  "Jide",
  "Kemi",
  "Lanre",
  "Musa",
  "Ngozi",
  "Obinna",
]
const SURNAMES = ["Test", "Sample", "Example"]

/** 45 students, the class size the brief's score-entry target uses (section 11). */
export const SPIKE_STUDENTS: readonly SpikeStudent[] = Array.from(
  { length: 45 },
  (_, i) => ({
    id: `0e000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length] ?? "Student"} ${
      SURNAMES[Math.floor(i / FIRST_NAMES.length)] ?? "Test"
    }`,
  })
)
