// The admin app's side of team sign-in (sign-in part B, section 8): who is signed in for
// a page, and a runner for server actions.
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { z } from "zod"

import {
  createLogger,
  getDatabase,
  newRequestId,
  toProblem,
  UnauthenticatedError,
  ValidationError,
  type ActionResult,
} from "@akoso/core/kernel"
import {
  authorizeTeam,
  resolveTeamSignedIn,
  type TeamBase,
  type TeamContext,
} from "@akoso/core/team"
import type { ActionKey } from "@akoso/schemas/api"

const log = createLogger()

function newBase(): TeamBase {
  const requestId = newRequestId()
  return {
    requestId,
    db: getDatabase(),
    now: () => new Date(),
    log: log.child({ requestId }),
  }
}

/** The signed-in team member for a page; sign-in otherwise; 404 without the permission. */
export async function requireTeam(
  permission?: ActionKey
): Promise<TeamContext> {
  const ctx = await resolveTeamSignedIn(new Headers(await headers()), newBase())
  if (ctx === null) redirect("/sign-in")
  if (permission !== undefined && !ctx.member.permissions.has(permission)) {
    notFound()
  }
  return ctx
}

/** The caller's IP, as the hosting platform's proxy appends it. */
export async function callerIp(): Promise<string | null> {
  const forwarded = (await headers()).get("x-forwarded-for")
  const last = forwarded?.split(",").at(-1)?.trim()
  return last === undefined || last === "" ? null : last
}

function parse<Input extends z.ZodObject>(
  schema: Input,
  raw: unknown
): z.output<Input> {
  const parsed = schema.strict().safeParse(raw)
  if (!parsed.success) throw ValidationError.fromZod(parsed.error)
  return parsed.data as z.output<Input>
}

/** A server action for a signed-in team member holding the permission (if one is named). */
export async function runTeamAction<Input extends z.ZodObject, Output>(
  schema: Input,
  permission: ActionKey | null,
  work: (ctx: TeamContext, input: z.output<Input>) => Promise<Output>,
  raw: unknown
): Promise<ActionResult<Output>> {
  const base = newBase()
  try {
    const ctx = await resolveTeamSignedIn(new Headers(await headers()), base)
    if (ctx === null) {
      return {
        ok: false,
        error: toProblem(new UnauthenticatedError(), base.requestId).body,
      }
    }
    if (permission !== null) authorizeTeam(ctx, permission)
    return { ok: true, data: await work(ctx, parse(schema, raw)) }
  } catch (error) {
    const mapped = toProblem(error, base.requestId)
    if (mapped.unexpected) base.log.error("Admin action failed", error)
    return { ok: false, error: mapped.body }
  }
}

/** A server action for someone not signed in yet (enrolment, recovery). */
export async function runPublicTeamAction<Input extends z.ZodObject, Output>(
  schema: Input,
  work: (base: TeamBase, input: z.output<Input>) => Promise<Output>,
  raw: unknown
): Promise<ActionResult<Output>> {
  const base = newBase()
  try {
    return { ok: true, data: await work(base, parse(schema, raw)) }
  } catch (error) {
    const mapped = toProblem(error, base.requestId)
    if (mapped.unexpected) base.log.error("Admin action failed", error)
    return { ok: false, error: mapped.body }
  }
}
