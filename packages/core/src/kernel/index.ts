// Public interface of the kernel: what every module's use cases and every app's routes
// share (spec: docs/specs/stage-1-api-and-service-conventions.md). Other modules import
// only from here.
export { runServerAction, type ActionDeps, type ActionResult } from "./action"
export { authorize } from "./authorize"
export {
  newRequestId,
  requireTenant,
  type Actor,
  type PublicContext,
  type RequestContext,
  type SystemActor,
  type UserActor,
} from "./context"
export { closeDatabase, getDatabase } from "./database"
export {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  IdempotencyMismatchError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitedError,
  SchoolReadOnlyError,
  SchoolUnavailableError,
  UnauthenticatedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./errors"
export { getHealth } from "./health"
export { assertSchoolAllows } from "./school-status"
export {
  handleRequest,
  type HttpDeps,
  type RouteParams,
  type UseCase,
} from "./http"
export {
  createLogger,
  type LogContext,
  type LogFields,
  type Logger,
  type LogSink,
} from "./logger"
export { decodeCursor, encodeCursor, toPage, type Page } from "./paging"
export { toProblem } from "./problem"
export { RATE_LIMITS } from "./rate-limit"
