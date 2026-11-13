"use server"

// Server actions for sign-in part B (spec: docs/specs/stage-1-sign-in-part-b.md). Each
// is one line over a use case: the pipeline checks sign-in, the school (named by slug
// in the input), the rate limit, the input and the permission.
import {
  archiveCustomRole,
  changeMemberRoles,
  confirmBackupPhone,
  confirmNumberChange,
  confirmPhoneChange,
  deleteCustomRole,
  deleteMyAccount,
  readSecurityLog,
  removeBackupPhone,
  requestBackupPhone,
  requestEmailChange,
  requestPhoneChange,
  resetMemberMfa,
  saveCustomRole,
  setMembershipStatus,
  setSchoolMfaRoles,
  startNumberChange,
  updateMyName,
} from "@akoso/core/identity"
import type { ActionResult } from "@akoso/core/kernel"
import {
  archiveCustomRoleInput,
  changeMemberRolesInput,
  confirmBackupPhoneInput,
  confirmNumberChangeInput,
  confirmPhoneChangeInput,
  customRoleRefInput,
  deleteAccountInput,
  readSecurityLogInput,
  requestEmailChangeInput,
  requestPhoneCodeInput,
  resetMemberMfaInput,
  saveCustomRoleInput,
  setMembershipStatusInput,
  setSchoolMfaRolesInput,
  startNumberChangeInput,
  updateNameInput,
} from "@akoso/schemas/identity"
import { z } from "zod"

import { serverAction } from "@/server/api"

const noInput = z.object({})

// People with access, custom roles and school settings.

const changeRoles = serverAction(
  { input: changeMemberRolesInput, permission: "identity.member.manage" },
  changeMemberRoles
)
export async function changeRolesAction(
  input: unknown
): ReturnType<typeof changeRoles> {
  return changeRoles(input)
}

const setStatus = serverAction(
  { input: setMembershipStatusInput, permission: "identity.member.manage" },
  setMembershipStatus
)
export async function setMembershipStatusAction(
  input: unknown
): ReturnType<typeof setStatus> {
  return setStatus(input)
}

const saveRole = serverAction(
  { input: saveCustomRoleInput, permission: "identity.role.manage" },
  saveCustomRole
)
export async function saveCustomRoleAction(
  input: unknown
): ReturnType<typeof saveRole> {
  return saveRole(input)
}

const archiveRole = serverAction(
  { input: archiveCustomRoleInput, permission: "identity.role.manage" },
  archiveCustomRole
)
export async function archiveCustomRoleAction(
  input: unknown
): ReturnType<typeof archiveRole> {
  return archiveRole(input)
}

const deleteRole = serverAction(
  { input: customRoleRefInput, permission: "identity.role.manage" },
  deleteCustomRole
)
export async function deleteCustomRoleAction(
  input: unknown
): ReturnType<typeof deleteRole> {
  return deleteRole(input)
}

const setMfaRoles = serverAction(
  { input: setSchoolMfaRolesInput, permission: "identity.role.manage" },
  setSchoolMfaRoles
)
export async function setSchoolMfaRolesAction(
  input: unknown
): ReturnType<typeof setMfaRoles> {
  return setMfaRoles(input)
}

// The security log's later pages.

const readLog = serverAction(
  { input: readSecurityLogInput, permission: "identity.security_log.read" },
  readSecurityLog
)
export async function readSecurityLogAction(
  input: unknown
): ReturnType<typeof readLog> {
  return readLog(input)
}

// The school changes a number or resets a second step.

const startChange = serverAction(
  { input: startNumberChangeInput, permission: "identity.contact.change" },
  startNumberChange
)
export async function startNumberChangeAction(
  input: unknown
): ReturnType<typeof startChange> {
  return startChange(input)
}

const confirmChange = serverAction(
  { input: confirmNumberChangeInput, permission: "identity.contact.change" },
  confirmNumberChange
)
export async function confirmNumberChangeAction(
  input: unknown
): ReturnType<typeof confirmChange> {
  return confirmChange(input)
}

const resetMfa = serverAction(
  { input: resetMemberMfaInput, permission: "identity.mfa.reset" },
  resetMemberMfa
)
export async function resetMemberMfaAction(
  input: unknown
): ReturnType<typeof resetMfa> {
  return resetMfa(input)
}

// My account.

const updateName = serverAction(
  { input: updateNameInput, permission: "identity.profile.update" },
  updateMyName
)
export async function updateNameAction(
  input: unknown
): ReturnType<typeof updateName> {
  return updateName(input)
}

const requestBackup = serverAction(
  { input: requestPhoneCodeInput, permission: "identity.profile.update" },
  requestBackupPhone
)
export async function requestBackupPhoneAction(
  input: unknown
): ReturnType<typeof requestBackup> {
  return requestBackup(input)
}

const confirmBackup = serverAction(
  { input: confirmBackupPhoneInput, permission: "identity.profile.update" },
  confirmBackupPhone
)
export async function confirmBackupPhoneAction(
  input: unknown
): ReturnType<typeof confirmBackup> {
  return confirmBackup(input)
}

const removeBackup = serverAction(
  { input: noInput, permission: "identity.profile.update" },
  removeBackupPhone
)
export async function removeBackupPhoneAction(
  input: unknown
): ReturnType<typeof removeBackup> {
  return removeBackup(input)
}

const requestPhone = serverAction(
  { input: requestPhoneCodeInput, permission: "identity.profile.update" },
  requestPhoneChange
)
export async function requestPhoneChangeAction(
  input: unknown
): ReturnType<typeof requestPhone> {
  return requestPhone(input)
}

const confirmPhone = serverAction(
  { input: confirmPhoneChangeInput, permission: "identity.profile.update" },
  confirmPhoneChange
)
export async function confirmPhoneChangeAction(
  input: unknown
): ReturnType<typeof confirmPhone> {
  return confirmPhone(input)
}

const requestEmail = serverAction(
  { input: requestEmailChangeInput, permission: "identity.profile.update" },
  requestEmailChange
)
export async function requestEmailChangeAction(
  input: unknown
): ReturnType<typeof requestEmail> {
  return requestEmail(input)
}

const deleteAccount = serverAction(
  { input: deleteAccountInput, permission: "identity.profile.update" },
  deleteMyAccount
)
export async function deleteAccountAction(
  input: unknown
): Promise<ActionResult<void>> {
  return deleteAccount(input)
}
