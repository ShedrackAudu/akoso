// Public interface of the school-setup module (spec: docs/specs/stage-2-school-setup-a.md).
// Other modules import only from here.
export {
  addNonSchoolDay,
  confirmHolidays,
  removeNonSchoolDay,
} from "./calendar"
export {
  createDefaultClasses,
  moveClass,
  removeArm,
  removeClass,
  saveArm,
  saveClass,
} from "./classes"
export { saveSchoolProfile } from "./profile"
export {
  checklistFor,
  getSchoolSetup,
  isSchoolDay,
  SETUP_STEPS,
  type AcademicSession,
  type ChecklistStep,
  type ClassArm,
  type Level,
  type NonSchoolDay,
  type SchoolClass,
  type SchoolProfile,
  type SchoolSetup,
  type SetupStepKey,
  type StepState,
  type Subject,
  type Term,
} from "./read"
export { makeSessionCurrent, saveSession, saveTerms } from "./sessions"
export {
  applySubjectPresets,
  archiveSubject,
  saveSubject,
  setArmSubjects,
  subjectCountWarning,
  type ArmSubjectsResult,
} from "./subjects"
