// Public interface of the team module: Akoso team sign-in and the team (sign-in part B,
// section 8). Only the admin app uses it; a boundary rule keeps the school app away.
export { verifyTeamAuditChain, type TeamChainCheck } from "./audit"
export { adminOrigins, TEAM_AUTH_BASE_PATH } from "./auth"
export {
  authorizeTeam,
  resolveTeamSignedIn,
  type TeamBase,
  type TeamContext,
  type TeamMember,
} from "./context"
export { TEAM_SECURITY_EVENT_KINDS, type TeamSecurityEventKind } from "./events"
export { getTeamAuth } from "./instance"
export {
  changeTeamRoles,
  createRecoveryCodes,
  deleteMyPasskey,
  getMyTeamSecurity,
  getTeamMember,
  inviteTeamMember,
  listTeamMembers,
  readTeamSecurityLog,
  recentRecoveryUses,
  removeTeamMember,
  startEnrolment,
  startRecovery,
  type MyTeamSecurity,
  type TeamMemberSummary,
  type TeamSecurityLogEntry,
} from "./service"
