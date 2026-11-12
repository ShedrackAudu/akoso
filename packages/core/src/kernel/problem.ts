// The one error mapper: any thrown value becomes a Problem Details body (RFC 9457) and
// an HTTP status. Titles follow docs/brand-voice.md: what happened and what to do next,
// calmly, with no stack traces, SQL or internal names (brief section 28.4, item 20).
import type { ErrorCode, ProblemDetails } from "@akoso/schemas/api"

import { AppError, ValidationError } from "./errors"

const TITLES: Record<ErrorCode, string> = {
  bad_request:
    "This request is missing something it needs. Please update the app and try again.",
  validation: "Some details need checking.",
  unauthenticated: "Please sign in to continue.",
  forbidden:
    "You don't have access to this. Ask your school administrator if you need it.",
  not_found: "We couldn't find that. It may have been moved or removed.",
  conflict:
    "This was changed by someone else a moment ago. Please refresh and try again.",
  idempotency_mismatch:
    "This request was sent twice with different details. Please try again.",
  payload_too_large: "This is too large to send in one go.",
  unsupported_media_type:
    "This request is in a form we can't read. Please update the app and try again.",
  school_closed:
    "This school's account has closed. Please contact the school office.",
  school_unavailable:
    "This school's account is paused. Please contact the school office.",
  school_read_only:
    "This school's account is read-only, so changes can't be saved. Please contact the school office.",
  rate_limited:
    "Too many attempts in a short time. Please wait a minute and try again.",
  internal: "Something went wrong on our side. Please try again in a moment.",
}

export interface MappedProblem {
  status: number
  body: ProblemDetails
  /** Seconds to wait, for 429 responses. */
  retryAfterSeconds?: number
  /** True when the error was a bug, so the caller logs its stack. */
  unexpected: boolean
}

/**
 * Turns anything thrown into the response the caller sees.
 *
 * @param error What was thrown. Only `AppError`s reveal anything about themselves;
 *   every other value becomes a generic 500 so nothing internal leaks.
 */
export function toProblem(error: unknown, requestId: string): MappedProblem {
  if (!(error instanceof AppError)) {
    return {
      status: 500,
      body: problem("internal", 500, requestId),
      unexpected: true,
    }
  }
  const body = problem(error.code, error.status, requestId)
  if (error instanceof ValidationError) {
    body.errors = [...error.fieldErrors]
  }
  return {
    status: error.status,
    body,
    ...("retryAfterSeconds" in error &&
    typeof error.retryAfterSeconds === "number"
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
    unexpected: false,
  }
}

function problem(
  code: ErrorCode,
  status: number,
  requestId: string
): ProblemDetails {
  return {
    type: `https://akoso.ng/errors/${code.replaceAll("_", "-")}`,
    title: TITLES[code],
    status,
    code,
    requestId,
  }
}
