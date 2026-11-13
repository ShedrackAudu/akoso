// Public interface of the identity module. Other modules import only from here.
export { accessFor, type PersonAccess, type SchoolMembership } from "./access"
export {
  confirmBackupPhone,
  confirmEmailChange,
  confirmPhoneChange,
  deleteMyAccount,
  getMyAccount,
  removeBackupPhone,
  requestBackupPhone,
  requestEmailChange,
  requestPhoneChange,
  updateMyName,
  type MyAccount,
} from "./account"
export { AUTH_BASE_PATH } from "./auth"
export { resolveSignedIn, type ResolveOptions, type SchoolRef } from "./context"
export { SECURITY_EVENT_KINDS, type SecurityEventKind } from "./events"
export { RECENT_SIGN_IN_MINUTES } from "./guards"
export {
  getAuth,
  getIdentityServices,
  setIdentityServices,
  type IdentityServices,
} from "./instance"
export {
  changeMemberRoles,
  getMember,
  listMembers,
  setMembershipStatus,
  type CustomRoleRef,
  type MemberSummary,
} from "./members"
export { normalisePhone } from "./phone"
export {
  confirmNumberChange,
  resetMemberMfa,
  startNumberChange,
} from "./recovery"
export {
  archiveCustomRole,
  deleteCustomRole,
  getSchoolMfaRoles,
  listCustomRoles,
  saveCustomRole,
  setSchoolMfaRoles,
  type CustomRole,
} from "./roles"
export {
  accessReview,
  accessReviewCsv,
  deviceKind,
  readSecurityLog,
  type AccessReviewRow,
  type DeviceKind,
  type SecurityLogEntry,
} from "./security-log"
export { getMe, getSecurityStatus, listMySchools } from "./service"
