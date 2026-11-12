// The few errors a use case throws. One mapper (problem.ts) turns each into the same
// Problem Details response and friendly message, so every endpoint, server action and
// screen reports problems the same way (ARCHITECTURE.md section 11).
import type { z } from "zod"

import type { ErrorCode, FieldError } from "@akoso/schemas/api"

/** An expected failure the caller can be told about. Anything else is a bug (500). */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode
  abstract readonly status: number
}

/** The request breaks a rule. Lists each field at fault. */
export class ValidationError extends AppError {
  readonly code = "validation"
  readonly status = 422
  constructor(
    readonly fieldErrors: readonly FieldError[],
    message = "Validation failed"
  ) {
    super(message)
    this.name = "ValidationError"
  }

  /** One rule broken, for one field (or the whole request when `path` is empty). */
  static of(path: string, message: string): ValidationError {
    return new ValidationError([{ path, message }])
  }

  /** Every issue Zod found, each with its dotted field path. */
  static fromZod(error: z.ZodError): ValidationError {
    return new ValidationError(
      error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      }))
    )
  }
}

/** The request itself is malformed in a way no field explains (e.g. a missing header). */
export class BadRequestError extends AppError {
  readonly code = "bad_request"
  readonly status = 400
  constructor(readonly detail: string) {
    super(detail)
    this.name = "BadRequestError"
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = "unauthenticated"
  readonly status = 401
  constructor() {
    super("Not signed in")
    this.name = "UnauthenticatedError"
  }
}

export class ForbiddenError extends AppError {
  readonly code = "forbidden"
  readonly status = 403
  constructor() {
    super("Not allowed")
    this.name = "ForbiddenError"
  }
}

/**
 * Missing, or belongs to another school or family. Both get the same answer, so
 * nobody can learn what exists elsewhere by trying IDs.
 */
export class NotFoundError extends AppError {
  readonly code = "not_found"
  readonly status = 404
  constructor() {
    super("Not found")
    this.name = "NotFoundError"
  }
}

/** The state changed underneath the request, e.g. the sheet is already approved. */
export class ConflictError extends AppError {
  readonly code = "conflict"
  readonly status = 409
  constructor(readonly detail?: string) {
    super(detail ?? "Conflict")
    this.name = "ConflictError"
  }
}

/** The same idempotency key was sent with a different request. */
export class IdempotencyMismatchError extends AppError {
  readonly code = "idempotency_mismatch"
  readonly status = 422
  constructor() {
    super("Idempotency key reused for a different request")
    this.name = "IdempotencyMismatchError"
  }
}

export class PayloadTooLargeError extends AppError {
  readonly code = "payload_too_large"
  readonly status = 413
  constructor() {
    super("Request body too large")
    this.name = "PayloadTooLargeError"
  }
}

export class UnsupportedMediaTypeError extends AppError {
  readonly code = "unsupported_media_type"
  readonly status = 415
  constructor() {
    super("Request body must be JSON")
    this.name = "UnsupportedMediaTypeError"
  }
}

export class RateLimitedError extends AppError {
  readonly code = "rate_limited"
  readonly status = 429
  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests")
    this.name = "RateLimitedError"
  }
}
