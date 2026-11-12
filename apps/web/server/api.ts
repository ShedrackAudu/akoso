// The web app's side of the request pipeline (spec:
// docs/specs/stage-1-api-and-service-conventions.md). Every /api/v1 route is one line:
//
//   export const GET = apiRoute(contracts.listMyClasses, listMyClasses)
//

import {
  createLogger,
  getDatabase,
  handleRequest,
  runServerAction,
  type ActionResult,
  type HttpDeps,
  type PublicContext,
  type RequestContext,
  type RouteParams,
} from "@akoso/core/kernel"
import { loadEnv } from "@akoso/core/config"
import type { ActionKey, Contract } from "@akoso/schemas/api"
import type { z } from "zod"

const log = createLogger()

/**
 * Nobody is signed in until sign-in exists (Stage 1, item 5). This is the single
 * place sign-in will plug in: read the session or bearer token, check the school in
 * the X-Akoso-School header against the user's memberships, and build the context.
 */
function resolveContext(): Promise<RequestContext | null> {
  return Promise.resolve(null)
}

/** Only Akoso's own app address may write with a cookie. */
function isAllowedOrigin(origin: string): boolean {
  const domain = loadEnv(process.env).APP_BASE_DOMAIN
  try {
    const { protocol, hostname } = new URL(origin)
    return (
      hostname === `app.${domain}` &&
      (protocol === "https:" || process.env.NODE_ENV !== "production")
    )
  } catch {
    return false
  }
}

/**
 * The caller's IP. The hosting platform's proxy appends the address it saw to
 * X-Forwarded-For, so the last entry is the one to trust. Revisit when Cloudflare is
 * put in front (it sends CF-Connecting-IP).
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  const last = forwarded?.split(",").at(-1)?.trim()
  return last === undefined || last === "" ? null : last
}

const deps: HttpDeps = {
  db: getDatabase,
  log,
  now: () => new Date(),
  resolveContext,
  isAllowedOrigin,
  clientIp,
}

type NextRouteContext = { params: Promise<RouteParams> }

/**
 * A route for signed-in callers holding the contract's permission. First used by
 * sign-in (Stage 1, item 5).
 *
 * @public
 */
export function apiRoute<Input extends z.ZodObject, Output extends z.ZodType>(
  contract: Contract<Input, Output> & { permission: ActionKey },
  useCase: (
    ctx: RequestContext,
    input: z.output<Input>
  ) => Promise<z.input<Output>>
) {
  return async (
    request: Request,
    route?: NextRouteContext
  ): Promise<Response> =>
    handleRequest(contract, useCase, request, deps, (await route?.params) ?? {})
}

/** A route anyone may call. Kept rare; each one is listed in the OpenAPI document. */
export function publicRoute<
  Input extends z.ZodObject,
  Output extends z.ZodType,
>(
  contract: Contract<Input, Output> & { public: true },
  useCase: (
    ctx: PublicContext,
    input: z.output<Input>
  ) => Promise<z.input<Output>>
) {
  return async (
    request: Request,
    route?: NextRouteContext
  ): Promise<Response> =>
    handleRequest(contract, useCase, request, deps, (await route?.params) ?? {})
}

/**
 * A server action over a use case, returning `{ ok, data }` or `{ ok, error }`. First
 * used by sign-in (Stage 1, item 5).
 *
 * @public
 */
export function serverAction<Input extends z.ZodObject, Output>(
  options: { input: Input; permission: ActionKey },
  useCase: (ctx: RequestContext, input: z.output<Input>) => Promise<Output>
) {
  return (rawInput: unknown): Promise<ActionResult<Output>> =>
    runServerAction(options, useCase, rawInput, {
      db: getDatabase,
      log,
      now: () => new Date(),
      resolveContext,
    })
}
