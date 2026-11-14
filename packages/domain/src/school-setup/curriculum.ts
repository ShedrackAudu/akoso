// The NERDC subject presets and subject limits (school setup part A spec, section 6).
// Data, not rules: a school may add, rename or remove anything. Every list cites its
// source. Items marked `confirm` are not stated by the source and must be checked by the
// founder (or a head teacher) before this ships (spec, open question 2).
//
// Sources, all from NERDC (Nigerian Educational Research and Development Council):
// - [N2025] "Basic and Senior Secondary Education Curriculum Offering", NERDC, Sheda-Abuja,
//   8 September 2025: https://nerdc.gov.ng/content_manager/Basic%20and%20Senior%20Secondary%20Education%20Curriculum%20Offerings.pdf
// - [N2025S] "Revised 9-Year Basic Education Curriculum Implementation Strategy", NERDC,
//   2025: https://nerdc.gov.ng/content_manager/Revised%209%20Year%20BEC%20Implementation%20Strategy%203.pdf
// - [N2014] Revised 9-Year Basic Education Curriculum, preface listing the ten subjects
//   (in every subject's curriculum, e.g. Pre-vocational Studies, Primary 4-6):
//   https://nerdc.gov.ng/content_manager/primary/pri4-6_prevoc_intro.pdf
// - [N2011] NERDC publications list, "Senior Secondary Curriculum / Trade Subjects":
//   https://www.nerdc.gov.ng/content_manager/pdf_files/nerdc_publications.pdf

import {
  CURRICULUM_VERSIONS,
  SCHOOL_TYPES,
  TRACKS,
  type SUBJECT_KINDS,
} from "@akoso/schemas/school-setup"

/** The standard classes of Nigerian schools, whatever a school calls them. */
export const STANDARD_CLASSES = [
  { key: "pre_nursery", label: "Pre-nursery", stage: "nursery" },
  { key: "nursery_1", label: "Nursery 1", stage: "nursery" },
  { key: "nursery_2", label: "Nursery 2", stage: "nursery" },
  { key: "reception", label: "Reception", stage: "nursery" },
  { key: "primary_1", label: "Primary 1", stage: "primary" },
  { key: "primary_2", label: "Primary 2", stage: "primary" },
  { key: "primary_3", label: "Primary 3", stage: "primary" },
  { key: "primary_4", label: "Primary 4", stage: "primary" },
  { key: "primary_5", label: "Primary 5", stage: "primary" },
  { key: "primary_6", label: "Primary 6", stage: "primary" },
  { key: "jss_1", label: "JSS 1", stage: "junior" },
  { key: "jss_2", label: "JSS 2", stage: "junior" },
  { key: "jss_3", label: "JSS 3", stage: "junior" },
  { key: "sss_1", label: "SSS 1", stage: "senior" },
  { key: "sss_2", label: "SSS 2", stage: "senior" },
  { key: "sss_3", label: "SSS 3", stage: "senior" },
] as const

export type StandardClassKey = (typeof STANDARD_CLASSES)[number]["key"]
export type Stage = (typeof STANDARD_CLASSES)[number]["stage"]

export const STAGE_LABELS: Readonly<Record<Stage, string>> = {
  nursery: "Nursery",
  primary: "Primary",
  junior: "Junior secondary",
  senior: "Senior secondary",
}

export { CURRICULUM_VERSIONS, SCHOOL_TYPES, TRACKS }
export type CurriculumVersion = (typeof CURRICULUM_VERSIONS)[number]

export const CURRICULUM_LABELS: Readonly<Record<CurriculumVersion, string>> = {
  nerdc_2025: "NERDC 2025 (revised)",
  nerdc_pre2025: "NERDC before 2025",
  own: "The school's own",
}

/** Senior secondary fields of study. Technology exists only before 2025 [N2011]. */
export type Track = (typeof TRACKS)[number]

export const TRACK_LABELS: Readonly<Record<Track, string>> = {
  science: "Science",
  humanities: "Humanities",
  business: "Business",
  technology: "Technology",
}

export type SubjectKind = (typeof SUBJECT_KINDS)[number]

export interface PresetSubject {
  /** A stable key, so a school's subject can be matched to its NERDC subject. */
  key: string
  name: string
  code: string
  kind: SubjectKind
}

const s = (
  key: string,
  name: string,
  code: string,
  kind: SubjectKind = "core"
): PresetSubject => ({ key, name, code, kind })

// The 2025 revised curriculum [N2025].

const NERDC_2025_TRADES = [
  s(
    "solar_pv",
    "Solar Photovoltaic Installation and Maintenance",
    "SPV",
    "trade"
  ),
  s("fashion_design", "Fashion Design and Garment Making", "FDG", "trade"),
  s("livestock_farming", "Livestock Farming", "LVF", "trade"),
  s("beauty_cosmetology", "Beauty and Cosmetology", "BCO", "trade"),
  s(
    "computer_hardware_gsm",
    "Computer Hardware and GSM Repairs",
    "CHG",
    "trade"
  ),
  s("horticulture", "Horticulture and Crop Production", "HCP", "trade"),
]

const NERDC_2025_PRIMARY_1_3 = [
  s("english_studies", "English Studies", "ENG"),
  s("mathematics", "Mathematics", "MTH"),
  s("nigerian_language", "Nigerian Language", "NGL"),
  s("basic_science", "Basic Science", "BSC"),
  s("physical_health_education", "Physical and Health Education", "PHE"),
  s("crs", "Christian Religious Studies", "CRS", "elective"),
  s("islamic_studies", "Islamic Studies", "IRS", "elective"),
  s("nigerian_history", "Nigerian History", "HIS"),
  s("social_citizenship", "Social and Citizenship Studies", "SCS"),
  s("cca", "Cultural and Creative Arts", "CCA"),
  s("arabic", "Arabic Language", "ARB", "optional"),
]

const NERDC_2025_PRIMARY_4_6 = [
  s("english_studies", "English Studies", "ENG"),
  s("mathematics", "Mathematics", "MTH"),
  s("nigerian_language", "Nigerian Language", "NGL"),
  s("basic_science_technology", "Basic Science and Technology", "BST"),
  s("physical_health_education", "Physical and Health Education", "PHE"),
  s("basic_digital_literacy", "Basic Digital Literacy", "BDL"),
  s("crs", "Christian Religious Studies", "CRS", "elective"),
  s("islamic_studies", "Islamic Studies", "IRS", "elective"),
  s("nigerian_history", "Nigerian History", "HIS"),
  s("social_citizenship", "Social and Citizenship Studies", "SCS"),
  s("cca", "Cultural and Creative Arts", "CCA"),
  s("pre_vocational", "Pre-vocational Studies", "PVS"),
  s("french", "French", "FRE", "optional"),
  s("arabic", "Arabic Language", "ARB", "optional"),
]

const NERDC_2025_JSS = [
  s("english_studies", "English Studies", "ENG"),
  s("mathematics", "Mathematics", "MTH"),
  s("nigerian_language", "Nigerian Language", "NGL"),
  s("intermediate_science", "Intermediate Science", "ISC"),
  s("physical_health_education", "Physical and Health Education", "PHE"),
  s("digital_technologies", "Digital Technologies", "DGT"),
  s("crs", "Christian Religious Studies", "CRS", "elective"),
  s("islamic_studies", "Islamic Studies", "IRS", "elective"),
  s("nigerian_history", "Nigerian History", "HIS"),
  s("social_citizenship", "Social and Citizenship Studies", "SCS"),
  s("cca", "Cultural and Creative Arts", "CCA"),
  s("business_studies", "Business Studies", "BUS"),
  ...NERDC_2025_TRADES,
  s("french", "French", "FRE", "optional"),
  s("arabic", "Arabic Language", "ARB", "optional"),
]

const NERDC_2025_SSS_CORE = [
  s("english_language", "English Language", "ENG"),
  s("general_mathematics", "General Mathematics", "MTH"),
  s("citizenship_heritage", "Citizenship and Heritage Studies", "CHS"),
  s("digital_technologies", "Digital Technologies", "DGT"),
  ...NERDC_2025_TRADES,
]

const NERDC_2025_SSS_FIELDS: Record<
  Exclude<Track, "technology">,
  PresetSubject[]
> = {
  science: [
    s("biology", "Biology", "BIO", "elective"),
    s("chemistry", "Chemistry", "CHE", "elective"),
    s("physics", "Physics", "PHY", "elective"),
    s("agriculture", "Agriculture", "AGR", "elective"),
    s("further_mathematics", "Further Mathematics", "FMA", "elective"),
    s("physical_education", "Physical Education", "PED", "elective"),
    s("health_education", "Health Education", "HED", "elective"),
    s("foods_nutrition", "Foods and Nutrition", "FNU", "elective"),
    s("geography", "Geography", "GEO", "elective"),
    s("technical_drawing", "Technical Drawing", "TDR", "elective"),
  ],
  humanities: [
    s("nigerian_history", "Nigerian History", "HIS", "elective"),
    s("government", "Government", "GOV", "elective"),
    s("crs", "Christian Religious Studies", "CRS", "elective"),
    s("islamic_studies", "Islamic Studies", "IRS", "elective"),
    s("nigerian_language", "Nigerian Language", "NGL", "elective"),
    s("french", "French", "FRE", "elective"),
    s("arabic", "Arabic", "ARB", "elective"),
    s("visual_arts", "Visual Arts", "VAR", "elective"),
    s("music", "Music", "MUS", "elective"),
    s("literature_english", "Literature in English", "LIT", "elective"),
    s("home_management", "Home Management", "HMG", "elective"),
    s("catering_craft", "Catering Craft", "CAT", "elective"),
  ],
  business: [
    s("accounting", "Accounting", "ACC", "elective"),
    s("commerce", "Commerce", "COM", "elective"),
    s("marketing", "Marketing", "MKT", "elective"),
    s("economics", "Economics", "ECO", "elective"),
  ],
}

// Before 2025: the revised 9-Year Basic Education Curriculum's ten subjects [N2014].
// `confirm`: which class levels take which subject is NOT stated in the source's
// subject list; this split (Pre-vocational Studies and French from Primary 4; Business
// Studies at JSS; Arabic optional) must be checked before shipping.

const NERDC_PRE2025_PRIMARY_1_3 = [
  s("english_studies", "English Studies", "ENG"),
  s("mathematics", "Mathematics", "MTH"),
  s("nigerian_language", "Nigerian Language", "NGL"),
  s("basic_science_technology", "Basic Science and Technology", "BST"),
  s("religion_national_values", "Religion and National Values", "RNV"),
  s("cca", "Cultural and Creative Arts", "CCA"),
  s("arabic", "Arabic", "ARB", "optional"),
]

const NERDC_PRE2025_PRIMARY_4_6 = [
  ...NERDC_PRE2025_PRIMARY_1_3.filter((subject) => subject.key !== "arabic"),
  s("pre_vocational", "Pre-vocational Studies", "PVS"),
  s("french", "French", "FRE"),
  s("arabic", "Arabic", "ARB", "optional"),
]

const NERDC_PRE2025_JSS = [
  ...NERDC_PRE2025_PRIMARY_4_6.filter((subject) => subject.key !== "arabic"),
  s("business_studies", "Business Studies", "BUS"),
  s("arabic", "Arabic", "ARB", "optional"),
]

// Senior secondary before 2025: the 2011 curriculum [N2011]. Core subjects and one
// trade subject; four fields of study. Of its 34 trade subjects, the list keeps those
// most schools offer; a school adds others by name.
const NERDC_PRE2025_SSS_CORE = [
  s("english_language", "English Language", "ENG"),
  s("general_mathematics", "Mathematics", "MTH"),
  s("civic_education", "Civic Education", "CVE"),
  s("data_processing", "Data Processing", "DPR", "trade"),
  s("catering_craft", "Catering Craft Practice", "CAT", "trade"),
  s("garment_making", "Garment Making", "GMK", "trade"),
  s("book_keeping", "Book Keeping", "BKP", "trade"),
  s("marketing_trade", "Marketing", "MKT", "trade"),
  s("animal_husbandry", "Animal Husbandry", "ANH", "trade"),
  s("photography", "Photography", "PHO", "trade"),
  s("gsm_maintenance", "GSM Maintenance", "GSM", "trade"),
  s("cosmetology", "Cosmetology", "COS", "trade"),
]

const NERDC_PRE2025_SSS_FIELDS: Record<Track, PresetSubject[]> = {
  science: [
    s("biology", "Biology", "BIO", "elective"),
    s("chemistry", "Chemistry", "CHE", "elective"),
    s("physics", "Physics", "PHY", "elective"),
    s("further_mathematics", "Further Mathematics", "FMA", "elective"),
    s("agriculture", "Agriculture", "AGR", "elective"),
    s("health_education", "Health Education", "HED", "elective"),
    s("physical_education", "Physical Education", "PED", "elective"),
    s("computer_ict", "Computer Studies / ICT", "ICT", "elective"),
  ],
  technology: [
    s("technical_drawing", "Technical Drawing", "TDR", "elective"),
    s("general_metal_work", "General Metal Work", "GMW", "elective"),
    s("basic_electricity", "Basic Electricity", "BEL", "elective"),
    s("electronics", "Electronics", "ELT", "elective"),
    s("auto_mechanics", "Auto Mechanics", "AUT", "elective"),
    s("building_construction", "Building Construction", "BLD", "elective"),
    s("woodwork", "Woodwork", "WWK", "elective"),
    s("home_management", "Home Management", "HMG", "elective"),
    s("foods_nutrition", "Food and Nutrition", "FNU", "elective"),
    s("clothing_textiles", "Clothing and Textiles", "CLT", "elective"),
  ],
  humanities: [
    s("nigerian_language", "Nigerian Language", "NGL", "elective"),
    s("geography", "Geography", "GEO", "elective"),
    s("literature_english", "Literature in English", "LIT", "elective"),
    s("government", "Government", "GOV", "elective"),
    s("history", "History", "HIS", "elective"),
    s("crs", "Christian Religious Studies", "CRS", "elective"),
    s("islamic_studies", "Islamic Studies", "IRS", "elective"),
    s("visual_arts", "Visual Arts", "VAR", "elective"),
    s("music", "Music", "MUS", "elective"),
    s("french", "French", "FRE", "elective"),
    s("arabic", "Arabic", "ARB", "elective"),
    s("economics", "Economics", "ECO", "elective"),
  ],
  business: [
    s("accounting", "Accounting", "ACC", "elective"),
    s("insurance", "Insurance", "INS", "elective"),
    s("office_practice", "Office Practice", "OFP", "elective"),
    s("store_management", "Store Management", "STM", "elective"),
    s("commerce", "Commerce", "COM", "elective"),
  ],
}

const stageOf = (standardClass: StandardClassKey): Stage =>
  STANDARD_CLASSES.find((entry) => entry.key === standardClass)?.stage ??
  "primary"

const lowerPrimary = new Set<StandardClassKey>([
  "primary_1",
  "primary_2",
  "primary_3",
])

/**
 * The NERDC subjects for an arm, by its standard class, curriculum version and (senior
 * secondary) field of study. Empty for nursery classes and for the school's own
 * curriculum: the school adds its own.
 */
export function presetSubjects(
  standardClass: StandardClassKey | null,
  version: CurriculumVersion,
  track: Track | null
): PresetSubject[] {
  if (standardClass === null || version === "own") return []
  const stage = stageOf(standardClass)
  if (stage === "nursery") return []
  if (version === "nerdc_2025") {
    if (stage === "primary") {
      return lowerPrimary.has(standardClass)
        ? NERDC_2025_PRIMARY_1_3
        : NERDC_2025_PRIMARY_4_6
    }
    if (stage === "junior") return NERDC_2025_JSS
    const field =
      track === null || track === "technology"
        ? []
        : NERDC_2025_SSS_FIELDS[track]
    return [...NERDC_2025_SSS_CORE, ...field]
  }
  if (stage === "primary") {
    return lowerPrimary.has(standardClass)
      ? NERDC_PRE2025_PRIMARY_1_3
      : NERDC_PRE2025_PRIMARY_4_6
  }
  if (stage === "junior") return NERDC_PRE2025_JSS
  return [
    ...NERDC_PRE2025_SSS_CORE,
    ...(track === null ? [] : NERDC_PRE2025_SSS_FIELDS[track]),
  ]
}

/**
 * The 2025 curriculum's subject limits, for a warning, never a block (brief 8). From
 * NERDC [N2025, N2025S] for the basic levels. NERDC's offering states no senior
 * secondary range; 8-9 is the brief's own figure (`confirm`).
 */
export function subjectLimits(
  standardClass: StandardClassKey | null,
  version: CurriculumVersion
): { min: number; max: number } | null {
  if (standardClass === null || version !== "nerdc_2025") return null
  const stage = stageOf(standardClass)
  if (stage === "primary") {
    return lowerPrimary.has(standardClass)
      ? { min: 9, max: 10 }
      : { min: 11, max: 13 }
  }
  if (stage === "junior") return { min: 12, max: 14 }
  if (stage === "senior") return { min: 8, max: 9 }
  return null
}

/** What a school teaches; a combined school has more than one. */
export type SchoolType = (typeof SCHOOL_TYPES)[number]

export const SCHOOL_TYPE_LABELS: Readonly<Record<SchoolType, string>> = {
  nursery: "Nursery",
  primary: "Primary",
  secondary: "Secondary",
}

const STAGES_FOR_TYPE: Readonly<Record<SchoolType, readonly Stage[]>> = {
  nursery: ["nursery"],
  primary: ["primary"],
  secondary: ["junior", "senior"],
}

/** The levels a school of these types starts with, in order (spec, edge cases). */
export function defaultStages(types: readonly SchoolType[]): Stage[] {
  const wanted = new Set(types.flatMap((type) => STAGES_FOR_TYPE[type]))
  return (Object.keys(STAGE_LABELS) as Stage[]).filter((stage) =>
    wanted.has(stage)
  )
}

/** The standard classes a school of these types starts with, in order. */
export function defaultClasses(
  types: readonly SchoolType[]
): (typeof STANDARD_CLASSES)[number][] {
  const stages = new Set(defaultStages(types))
  return STANDARD_CLASSES.filter((entry) => stages.has(entry.stage))
}

export const isStandardClass = (value: string): value is StandardClassKey =>
  STANDARD_CLASSES.some((entry) => entry.key === value)

export const stageOfClass = (standardClass: StandardClassKey): Stage =>
  stageOf(standardClass)

// The 2025 curriculum starts in September 2025 with Primary 1, Primary 4, JSS 1 and SS 1
// and moves up with those pupils, one class a year [N2025S]. So in the session starting
// in 2026, the first two classes of each band are on it.
const BANDS: readonly (readonly StandardClassKey[])[] = [
  ["primary_1", "primary_2", "primary_3"],
  ["primary_4", "primary_5", "primary_6"],
  ["jss_1", "jss_2", "jss_3"],
  ["sss_1", "sss_2", "sss_3"],
]

/**
 * The curriculum a new arm starts on, for a session starting in `sessionStartYear`. A
 * default only: the school sets each arm's version itself. Nursery arms have no NERDC
 * subject list, so they start on the school's own.
 */
export function defaultCurriculum(
  standardClass: StandardClassKey | null,
  sessionStartYear: number
): CurriculumVersion {
  if (standardClass === null) return "own"
  const band = BANDS.find((entry) => entry.includes(standardClass))
  if (band === undefined) return "own"
  const yearsIn = sessionStartYear - 2025 + 1
  return band.indexOf(standardClass) < yearsIn ? "nerdc_2025" : "nerdc_pre2025"
}
