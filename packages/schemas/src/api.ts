// The shape of every /api/v1 endpoint (brief section 5.1; spec
// docs/specs/stage-1-api-and-service-conventions.md). A contract is declared once and
// drives the route handler, the OpenAPI document and the typed client, so the three
// cannot drift apart. Zod only: this file also runs in the Expo app.
import { z } from "zod"

/**
 * A permission, named `<module>.<thing>.<verb>`, e.g. `fees.statement.read`. Every key
 * a contract uses must be listed in `KNOWN_ACTIONS` (contracts/index.ts) and in
 * docs/permissions.md; a test checks this.
 */
export type ActionKey = `${string}.${string}.${string}`

/** How often callers may use an endpoint. The numbers live in core's configuration. */
export type RateLimitClass = "standard" | "write" | "export" | "public" | "none"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

/** Who may call an endpoint: a signed-in user holding a permission, or anyone. */
export type Access =
  | { permission: ActionKey; public?: never }
  | { public: true; permission?: never }

export type ContractShape<
  Input extends z.ZodObject = z.ZodObject,
  Output extends z.ZodType = z.ZodType,
> = {
  method: HttpMethod
  /** Starts with /api/v1/. Path parameters are written `{name}` and are also input fields. */
  path: `/api/v1/${string}`
  summary: string
  /** The query string for GET, the JSON body otherwise. Unknown fields are rejected. */
  input: Input
  /** Fields the caller may see. Anything else the use case returns is dropped. */
  output: Output
  rateLimit: RateLimitClass
  /** The largest body accepted, in bytes. Defaults to 1 MB. */
  maxBodyBytes?: number
}

export type Contract<
  Input extends z.ZodObject = z.ZodObject,
  Output extends z.ZodType = z.ZodType,
> = ContractShape<Input, Output> & Access

export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024

/**
 * Declares an endpoint. The input is made strict here, once, so an unknown field is
 * always rejected rather than silently ignored (mass assignment, brief section 28).
 */
export function defineContract<
  Input extends z.ZodObject,
  Output extends z.ZodType,
  A extends Access,
>(
  contract: ContractShape<Input, Output> & A
): ContractShape<Input, Output> & A {
  if (contract.rateLimit === "none" && contract.public !== true) {
    throw new Error(
      `${contract.path}: only public endpoints may skip rate limits`
    )
  }
  return { ...contract, input: contract.input.strict() as Input }
}

/** Writes need an Idempotency-Key header. */
export const isWrite = (method: HttpMethod): boolean => method !== "GET"

// Pagination (cursor-based, never offsets).

export const PAGE_DEFAULT_LIMIT = 25
export const PAGE_MAX_LIMIT = 100

/** Query fields every list endpoint accepts. Spread into the contract's input. */
export const pageQuery = {
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_MAX_LIMIT)
    .default(PAGE_DEFAULT_LIMIT),
  cursor: z.string().min(1).max(512).optional(),
}

/** A page of a list: the items, and the cursor for the next page or null at the end. */
export const page = <Item extends z.ZodType>(
  item: Item
): z.ZodObject<{
  data: z.ZodArray<Item>
  nextCursor: z.ZodNullable<z.ZodString>
}> => z.object({ data: z.array(item), nextCursor: z.string().nullable() })

// Errors: Problem Details (RFC 9457), with Akoso's fields added.

export const ERROR_CODES = [
  "bad_request",
  "validation",
  "unauthenticated",
  "forbidden",
  "mfa_required",
  "not_found",
  "conflict",
  "idempotency_mismatch",
  "payload_too_large",
  "unsupported_media_type",
  "rate_limited",
  "school_unavailable",
  "school_closed",
  "school_read_only",
  "internal",
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const fieldErrorSchema = z.object({
  /** Dotted path to the field, e.g. "scores.3.value". Empty for the whole request. */
  path: z.string(),
  message: z.string(),
})
export type FieldError = z.infer<typeof fieldErrorSchema>

export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  code: z.enum(ERROR_CODES),
  requestId: z.string(),
  errors: z.array(fieldErrorSchema).optional(),
})
export type ProblemDetails = z.infer<typeof problemDetailsSchema>

export const REQUEST_ID_HEADER = "X-Request-Id"
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
export const SCHOOL_HEADER = "X-Akoso-School"
export const IDEMPOTENT_REPLAY_HEADER = "Idempotent-Replayed"

/** A client-made idempotency key: 8 to 128 safe characters, e.g. a UUID. */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)
