"use server"

// Server actions for school setup part A (spec: docs/specs/stage-2-school-setup-a.md).
// Each is one line over a use case: the pipeline checks sign-in, the school (named by
// slug in the input), the rate limit, the input and the permission.
import {
  addNonSchoolDay as addNonSchoolDayUseCase,
  applySubjectPresets as applySubjectPresetsUseCase,
  archiveSubject as archiveSubjectUseCase,
  confirmHolidays as confirmHolidaysUseCase,
  createDefaultClasses as createDefaultClassesUseCase,
  makeSessionCurrent as makeSessionCurrentUseCase,
  moveClass as moveClassUseCase,
  removeArm as removeArmUseCase,
  removeClass as removeClassUseCase,
  removeNonSchoolDay as removeNonSchoolDayUseCase,
  saveArm as saveArmUseCase,
  saveClass as saveClassUseCase,
  saveSchoolProfile as saveSchoolProfileUseCase,
  saveSession as saveSessionUseCase,
  saveSubject as saveSubjectUseCase,
  saveTerms as saveTermsUseCase,
  setArmSubjects as setArmSubjectsUseCase,
} from "@akoso/core/school-setup"
import {
  addNonSchoolDayInput,
  applySubjectPresetsInput,
  confirmHolidaysInput,
  createDefaultClassesInput,
  moveClassInput,
  nonSchoolDayRefInput,
  saveArmInput,
  saveClassInput,
  saveProfileInput,
  saveSessionInput,
  saveSubjectInput,
  saveTermsInput,
  sessionRefInput,
  setArmSubjectsInput,
  setupRefInput,
} from "@akoso/schemas/school-setup"

import { serverAction } from "@/server/api"

const MANAGE = "setup.school.manage" as const

const saveProfileRun = serverAction(
  { input: saveProfileInput, permission: MANAGE },
  saveSchoolProfileUseCase
)
export async function saveProfileAction(
  input: unknown
): ReturnType<typeof saveProfileRun> {
  return saveProfileRun(input)
}

const saveSessionRun = serverAction(
  { input: saveSessionInput, permission: MANAGE },
  saveSessionUseCase
)
export async function saveSessionAction(
  input: unknown
): ReturnType<typeof saveSessionRun> {
  return saveSessionRun(input)
}

const makeSessionCurrentRun = serverAction(
  { input: sessionRefInput, permission: MANAGE },
  makeSessionCurrentUseCase
)
export async function makeSessionCurrentAction(
  input: unknown
): ReturnType<typeof makeSessionCurrentRun> {
  return makeSessionCurrentRun(input)
}

const saveTermsRun = serverAction(
  { input: saveTermsInput, permission: MANAGE },
  saveTermsUseCase
)
export async function saveTermsAction(
  input: unknown
): ReturnType<typeof saveTermsRun> {
  return saveTermsRun(input)
}

const addNonSchoolDayRun = serverAction(
  { input: addNonSchoolDayInput, permission: MANAGE },
  addNonSchoolDayUseCase
)
export async function addNonSchoolDayAction(
  input: unknown
): ReturnType<typeof addNonSchoolDayRun> {
  return addNonSchoolDayRun(input)
}

const removeNonSchoolDayRun = serverAction(
  { input: nonSchoolDayRefInput, permission: MANAGE },
  removeNonSchoolDayUseCase
)
export async function removeNonSchoolDayAction(
  input: unknown
): ReturnType<typeof removeNonSchoolDayRun> {
  return removeNonSchoolDayRun(input)
}

const confirmHolidaysRun = serverAction(
  { input: confirmHolidaysInput, permission: MANAGE },
  confirmHolidaysUseCase
)
export async function confirmHolidaysAction(
  input: unknown
): ReturnType<typeof confirmHolidaysRun> {
  return confirmHolidaysRun(input)
}

const createDefaultClassesRun = serverAction(
  { input: createDefaultClassesInput, permission: MANAGE },
  createDefaultClassesUseCase
)
export async function createDefaultClassesAction(
  input: unknown
): ReturnType<typeof createDefaultClassesRun> {
  return createDefaultClassesRun(input)
}

const saveClassRun = serverAction(
  { input: saveClassInput, permission: MANAGE },
  saveClassUseCase
)
export async function saveClassAction(
  input: unknown
): ReturnType<typeof saveClassRun> {
  return saveClassRun(input)
}

const moveClassRun = serverAction(
  { input: moveClassInput, permission: MANAGE },
  moveClassUseCase
)
export async function moveClassAction(
  input: unknown
): ReturnType<typeof moveClassRun> {
  return moveClassRun(input)
}

const removeClassRun = serverAction(
  { input: setupRefInput, permission: MANAGE },
  removeClassUseCase
)
export async function removeClassAction(
  input: unknown
): ReturnType<typeof removeClassRun> {
  return removeClassRun(input)
}

const saveArmRun = serverAction(
  { input: saveArmInput, permission: MANAGE },
  saveArmUseCase
)
export async function saveArmAction(
  input: unknown
): ReturnType<typeof saveArmRun> {
  return saveArmRun(input)
}

const removeArmRun = serverAction(
  { input: setupRefInput, permission: MANAGE },
  removeArmUseCase
)
export async function removeArmAction(
  input: unknown
): ReturnType<typeof removeArmRun> {
  return removeArmRun(input)
}

const saveSubjectRun = serverAction(
  { input: saveSubjectInput, permission: MANAGE },
  saveSubjectUseCase
)
export async function saveSubjectAction(
  input: unknown
): ReturnType<typeof saveSubjectRun> {
  return saveSubjectRun(input)
}

const archiveSubjectRun = serverAction(
  { input: setupRefInput, permission: MANAGE },
  archiveSubjectUseCase
)
export async function archiveSubjectAction(
  input: unknown
): ReturnType<typeof archiveSubjectRun> {
  return archiveSubjectRun(input)
}

const setArmSubjectsRun = serverAction(
  { input: setArmSubjectsInput, permission: MANAGE },
  setArmSubjectsUseCase
)
export async function setArmSubjectsAction(
  input: unknown
): ReturnType<typeof setArmSubjectsRun> {
  return setArmSubjectsRun(input)
}

const applySubjectPresetsRun = serverAction(
  { input: applySubjectPresetsInput, permission: MANAGE },
  applySubjectPresetsUseCase
)
export async function applySubjectPresetsAction(
  input: unknown
): ReturnType<typeof applySubjectPresetsRun> {
  return applySubjectPresetsRun(input)
}
