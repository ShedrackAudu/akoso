// The server-action counterpart of handleRequest (spec section 8). Same steps minus the
// HTTP-only ones, and the result comes back as a value, so a form can show each field
// error beside its field.
import type { z } from "zod"

import type { ActionKey, ProblemDetails } from "@akoso/schemas/api"

import { authorize } from "./authorize"
import {
  newRequestId,
  type PublicContext,
  type RequestContext,
} from "./context"
import { UnauthenticatedError, ValidationError } from "./errors"
import type { HttpDeps, UseCase } from "./http"
import { toProblem } from "./problem"
import { consumeRateLimit } from "./rate-limit"
import { assertSchoolAllows } from "./school-status"

export type ActionResult<Data> =
  { ok: true; data: Data } | { ok: false; error: ProblemDetails }

export type ActionDeps = Pick<HttpDeps, "db" | "log" | "now"> & {
  /**
   * The signed-in context for this action, or null. Supplied by sign-in (item 5). It
   * sees the raw input, so a school-scoped action can name its school there (`school`,
   * the slug from the address); the school is still checked against memberships.
   */
  resolveContext: (
    base: PublicContext,
    rawInput: unknown
  ) => Promise<RequestContext | null>
}

/**
 * Runs a use case for a server action: sign-in, rate limit, input, permission, the
 * use case, any error. Money and results actions also take an idempotency key in
 * their input (spec section 5); they are wired when the first one is built.
 */
export async function runServerAction<Input extends z.ZodObject, Output>(
  options: { input: Input; permission: ActionKey },
  useCase: UseCase<RequestContext, z.output<Input>, Output>,
  rawInput: unknown,
  deps: ActionDeps
): Promise<ActionResult<Output>> {
  const requestId = newRequestId()
  const base: PublicContext = {
    requestId,
    db: deps.db(),
    now: deps.now,
    log: deps.log.child({ requestId }),
  }
  try {
    const ctx = await deps.resolveContext(base, rawInput)
    if (ctx === null) throw new UnauthenticatedError()
    // Server actions change things, so a read-only school refuses them too.
    assertSchoolAllows(ctx.school, true)
    await consumeRateLimit(
      base.db,
      "write",
      {
        userId: ctx.actor.kind === "user" ? ctx.actor.userId : null,
        tenantId: ctx.tenantId,
      },
      deps.now
    )
    const input = options.input.strict().safeParse(rawInput)
    if (!input.success) {
      throw ValidationError.fromZod(input.error)
    }
    authorize(ctx, options.permission)
    // `.strict()` only rejects unknown keys; the parsed shape is still the schema's own.
    return { ok: true, data: await useCase(ctx, input.data as z.output<Input>) }
  } catch (error) {
    const mapped = toProblem(error, requestId)
    if (mapped.unexpected) base.log.error("Server action failed", error)
    return { ok: false, error: mapped.body }
  }
}
