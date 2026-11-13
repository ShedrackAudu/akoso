"use server"

// Server actions for the admin app (sign-in part B, section 8). Each is one line over a
// team use case; the runner checks the session, the input and the permission.
import type { ActionResult } from "@akoso/core/kernel"
import {
  changeTeamRoles,
  createRecoveryCodes,
  deleteMyPasskey,
  inviteTeamMember,
  removeTeamMember,
  startEnrolment,
  startRecovery,
  type TeamMemberSummary,
} from "@akoso/core/team"
import {
  changeTeamRolesInput,
  deletePasskeyInput,
  inviteTeamMemberInput,
  removeTeamMemberInput,
  startEnrolmentInput,
  startRecoveryInput,
} from "@akoso/schemas/team"
import { z } from "zod"

import { callerIp, runPublicTeamAction, runTeamAction } from "@/server/team"

export async function startEnrolmentAction(
  input: unknown
): Promise<ActionResult<{ ticket: string; email: string }>> {
  return runPublicTeamAction(startEnrolmentInput, startEnrolment, input)
}

export async function startRecoveryAction(
  input: unknown
): Promise<ActionResult<{ ticket: string }>> {
  const ip = await callerIp()
  return runPublicTeamAction(
    startRecoveryInput,
    (base, parsed) => startRecovery(base, parsed, ip),
    input
  )
}

export async function createRecoveryCodesAction(
  input: unknown
): Promise<ActionResult<{ codes: string[] }>> {
  return runTeamAction(z.object({}), null, createRecoveryCodes, input)
}

export async function deletePasskeyAction(
  input: unknown
): Promise<ActionResult<void>> {
  return runTeamAction(deletePasskeyInput, null, deleteMyPasskey, input)
}

export async function inviteTeamMemberAction(
  input: unknown
): Promise<ActionResult<{ link: string }>> {
  return runTeamAction(
    inviteTeamMemberInput,
    "team.member.manage",
    inviteTeamMember,
    input
  )
}

export async function changeTeamRolesAction(
  input: unknown
): Promise<ActionResult<TeamMemberSummary>> {
  return runTeamAction(
    changeTeamRolesInput,
    "team.member.manage",
    changeTeamRoles,
    input
  )
}

export async function removeTeamMemberAction(
  input: unknown
): Promise<ActionResult<void>> {
  return runTeamAction(
    removeTeamMemberInput,
    "team.member.manage",
    removeTeamMember,
    input
  )
}
