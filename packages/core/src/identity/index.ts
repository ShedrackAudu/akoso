// Public interface of the identity module. Other modules import only from here.
export { accessFor, type PersonAccess, type SchoolMembership } from "./access"
export { AUTH_BASE_PATH } from "./auth"
export { resolveSignedIn, type ResolveOptions, type SchoolRef } from "./context"
export { getAuth } from "./instance"
export { normalisePhone } from "./phone"
export { getMe, getSecurityStatus, listMySchools } from "./service"
