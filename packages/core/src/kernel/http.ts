// The one request pipeline behind every /api/v1 route (spec section 3). It uses only
// the standard Request and Response, so it has no tie to Next.js; apps wrap it.
import type { z } from "zod"

import type { Database } from "@akoso/db"
import {
  DEFAULT_MAX_BODY_BYTES,
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAY_HEADER,
  idempotencyKeySchema,
  isWrite,
  REQUEST_ID_HEADER,
  type Contract,
} from "@akoso/schemas/api"

import { authorize } from "./authorize"
import {
  newRequestId,
  type PublicContext,
  type RequestContext,
} from "./context"
import {
  BadRequestError,
  ForbiddenError,
  PayloadTooLargeError,
  UnauthenticatedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./errors"
import {
  beginIdempotent,
  finishIdempotent,
  hashRequest,
  releaseIdempotent,
  type IdempotencyScope,
} from "./idempotency"
import type { Logger } from "./logger"
import { toProblem } from "./problem"
import { assertSchoolAllows } from "./school-status"
import { consumeRateLimit } from "./rate-limit"

/** What a route needs from the app around it. Injected, so tests can supply fakes. */
export interface HttpDeps {
  db: () => Database
  log: Logger
  now: () => Date
  /**
   * Builds the signed-in context, with the school already checked against the user's
   * memberships, or returns null when nobody is signed in. A non-member asking for a
   * school throws NotFoundError. Sign-in (Stage 1, item 5) supplies the real one;
   * until then nobody is ever signed in.
   */
  resolveContext: (
    request: Request,
    base: PublicContext
  ) => Promise<RequestContext | null>
  /** Whether an Origin may write with a cookie: only Akoso's own origins. */
  isAllowedOrigin: (origin: string) => boolean
  /** The caller's IP, as the platform's proxy reports it. */
  clientIp: (request: Request) => string | null
}

export type UseCase<Ctx, Input, Output> = (
  ctx: Ctx,
  input: Input
) => Promise<Output>

/** Path parameters, as the router passes them. */
export type RouteParams = Record<string, string>

async function readJsonBody(
  request: Request,
  maxBytes: number
): Promise<{ text: string; value: unknown }> {
  const type = request.headers.get("content-type") ?? ""
  if (!/^application\/json\s*(;|$)/i.test(type)) {
    throw new UnsupportedMediaTypeError()
  }
  if (Number(request.headers.get("content-length") ?? "0") > maxBytes) {
    throw new PayloadTooLargeError()
  }
  const text = await request.text()
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new PayloadTooLargeError()
  }
  try {
    return { text, value: JSON.parse(text) as unknown }
  } catch {
    throw ValidationError.of("", "This request is not valid JSON.")
  }
}

function jsonResponse(
  status: number,
  body: unknown,
  requestId: string,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type":
        status >= 400 ? "application/problem+json" : "application/json",
      "Cache-Control": "no-store",
      [REQUEST_ID_HEADER]: requestId,
      ...extra,
    },
  })
}

/**
 * Handles one request for one contract, in order: sign-in and school, origin, rate
 * limit, input, permission, idempotency, the use case, the output, any error, then
 * one log line.
 *
 * @param params Path parameters from the router, if the path has any. They are
 *   validated with the rest of the input.
 */
export async function handleRequest<
  Input extends z.ZodObject,
  Output extends z.ZodType,
>(
  contract: Contract<Input, Output>,
  useCase: UseCase<never, z.output<Input>, z.input<Output>>,
  request: Request,
  deps: HttpDeps,
  params: RouteParams = {}
): Promise<Response> {
  const started = performance.now()
  const requestId = newRequestId()
  const base: PublicContext = {
    requestId,
    db: deps.db(),
    now: deps.now,
    log: deps.log.child({ requestId }),
  }
  let log = base.log
  let idempotency: IdempotencyScope | undefined
  // An object, because the flag is set inside run() and read after it.
  const outcome = { replayed: false }

  const run = async (): Promise<Response> => {
    let ctx: RequestContext | PublicContext = base
    let userId: string | null = null
    let tenantId: string | null = null
    const write = isWrite(contract.method)
    if (contract.public !== true) {
      const resolved = await deps.resolveContext(request, base)
      if (resolved === null) throw new UnauthenticatedError()
      tenantId = resolved.tenantId
      userId = resolved.actor.kind === "user" ? resolved.actor.userId : null
      log = log.child({ tenantId, userId })
      ctx = { ...resolved, log }
      assertSchoolAllows(resolved.school, write)
    }

    const origin = request.headers.get("origin")
    if (
      write &&
      request.headers.has("cookie") &&
      origin !== null &&
      !deps.isAllowedOrigin(origin)
    ) {
      throw new ForbiddenError()
    }

    await consumeRateLimit(
      base.db,
      contract.rateLimit,
      { userId, tenantId, ip: deps.clientIp(request) },
      deps.now
    )

    const url = new URL(request.url)
    let raw: object
    let bodyText = ""
    if (contract.method === "GET") {
      raw = Object.fromEntries(url.searchParams)
    } else {
      const body = await readJsonBody(
        request,
        contract.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
      )
      if (
        body.value === null ||
        typeof body.value !== "object" ||
        Array.isArray(body.value)
      ) {
        throw ValidationError.of("", "The request body must be a JSON object.")
      }
      raw = body.value
      bodyText = body.text
    }
    const input = contract.input.safeParse({ ...raw, ...params })
    if (!input.success) throw ValidationError.fromZod(input.error)

    if (contract.public !== true) {
      authorize(ctx as RequestContext, contract.permission)
    }

    if (write) {
      const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)
      if (key === null || !idempotencyKeySchema.safeParse(key).success) {
        throw new BadRequestError(
          `Writes need an ${IDEMPOTENCY_KEY_HEADER} header`
        )
      }
      if (tenantId === null || userId === null) {
        // No platform-level write exists yet; its key storage comes with the first one.
        throw new Error("Idempotent writes need a school and a signed-in user")
      }
      const scope: IdempotencyScope = { db: base.db, tenantId, userId, key }
      const start = await beginIdempotent(
        scope,
        hashRequest(contract.method, url.pathname, bodyText)
      )
      if (start.kind === "replay") {
        outcome.replayed = true
        return jsonResponse(start.status, start.body, requestId, {
          [IDEMPOTENT_REPLAY_HEADER]: "true",
        })
      }
      idempotency = scope
    }

    const result = await (useCase as UseCase<typeof ctx, unknown, unknown>)(
      ctx,
      input.data
    )
    const output = contract.output.safeParse(result)
    if (!output.success) {
      throw new Error(
        `The output of ${contract.method} ${contract.path} did not match its contract`
      )
    }
    if (idempotency) await finishIdempotent(idempotency, 200, output.data)
    return jsonResponse(200, output.data, requestId)
  }

  let response: Response
  let code: string | undefined
  try {
    response = await run()
  } catch (error) {
    const mapped = toProblem(error, requestId)
    code = mapped.body.code
    if (idempotency) {
      // A bug: forget the key so a retry runs again. An expected failure: store it,
      // so a retry gets the same answer.
      const settle = mapped.unexpected
        ? releaseIdempotent(idempotency)
        : finishIdempotent(idempotency, mapped.status, mapped.body)
      await settle.catch((settleError: unknown) => {
        log.error("Could not settle idempotency key", settleError)
      })
    }
    if (mapped.unexpected) {
      log.error("Request failed", error, {
        route: contract.path,
        method: contract.method,
      })
    }
    response = jsonResponse(
      mapped.status,
      mapped.body,
      requestId,
      mapped.retryAfterSeconds === undefined
        ? {}
        : { "Retry-After": String(mapped.retryAfterSeconds) }
    )
  }

  log.info("Request", {
    route: contract.path,
    method: contract.method,
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    ...(code === undefined ? {} : { code }),
    ...(outcome.replayed ? { replayed: true } : {}),
  })
  return response
}
