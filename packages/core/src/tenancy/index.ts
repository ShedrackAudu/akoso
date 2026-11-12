// Public interface of the tenancy module. Other modules import only from here.
export {
  createSchoolCache,
  SchoolLookupBusyError,
  type SchoolCache,
  type SchoolCacheOptions,
} from "./cache"
export { classifyHost, normaliseHost, type HostKind } from "./host"
export { findSchoolByHost, findSchoolById, findSchoolBySlug } from "./lookup"
