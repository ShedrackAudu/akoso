// Use cases for the signed-in person (spec section 6).
import type { MySchool } from "@akoso/schemas/contracts/identity"

import { sql } from "@akoso/db"

import { authorize, NotFoundError, type RequestContext } from "../kernel/index"
import { accessFor } from "./access"

function userIdOf(ctx: RequestContext): string {
  if (ctx.actor.kind !== "user") throw new NotFoundError()
  return ctx.actor.userId
}

/** Who is signed in: ID, name, and whether their second step is on. */
export async function getMe(
  ctx: RequestContext
): Promise<{ id: string; name: string; mfaEnabled: boolean }> {
  authorize(ctx, "identity.profile.read")
  const result = await ctx.db.execute(sql`
    select id, name, two_factor_enabled from platform.users where id = ${userIdOf(ctx)}`)
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  return {
    id: String(row.id),
    name: String(row.name),
    mfaEnabled: row.two_factor_enabled === true,
  }
}

/** The schools the person may use, with their roles in each: the school picker. */
export async function listMySchools(
  ctx: RequestContext
): Promise<{ data: MySchool[]; nextCursor: null }> {
  authorize(ctx, "identity.membership.list_own")
  const access = await accessFor(ctx.db, userIdOf(ctx))
  return {
    data: access.schools.map(({ school, roles }) => ({
      id: school.id,
      slug: school.slug,
      name: school.name,
      status: school.status,
      roles,
    })),
    nextCursor: null,
  }
}

/** What the security settings page shows: second step on, required, password set. */
export async function getSecurityStatus(ctx: RequestContext): Promise<{
  mfaEnabled: boolean
  mfaRequired: boolean
  hasPassword: boolean
}> {
  authorize(ctx, "identity.profile.read")
  const userId = userIdOf(ctx)
  const result = await ctx.db.execute(sql`
    select u.two_factor_enabled,
           exists (select 1 from platform.user_credentials c
                   where c.user_id = u.id and c.provider_id = 'credential'
                     and c.password is not null) as has_password
    from platform.users u where u.id = ${userId}`)
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  const access = await accessFor(ctx.db, userId)
  return {
    mfaEnabled: row.two_factor_enabled === true,
    mfaRequired: access.mfaRequired,
    hasPassword: row.has_password === true,
  }
}

/** What the app frame shows a person (app frame spec, section 9). */
export interface FrameInfo {
  name: string
  /** The schools they may use, for the school switcher. */
  schools: { slug: string; name: string }[]
  /** This request's school, or null on pages across schools. */
  school: { slug: string; name: string; status: string } | null
  /** They work for this school (a staff role or a custom role). */
  isStaffHere: boolean
  /** They are a parent or guardian in this school. */
  isGuardianHere: boolean
  /** Their permissions in this school, for the navigation list. */
  permissions: string[]
}

/** Everything the frame needs, in one read. */
export async function getFrame(ctx: RequestContext): Promise<FrameInfo> {
  const userId = userIdOf(ctx)
  const [user, access] = await Promise.all([
    ctx.db.execute(sql`select name from platform.users where id = ${userId}`),
    accessFor(ctx.db, userId),
  ])
  const here =
    ctx.tenantId === null
      ? undefined
      : access.schools.find((school) => school.school.id === ctx.tenantId)
  return {
    name: typeof user.rows[0]?.name === "string" ? user.rows[0].name : "",
    schools: access.schools.map(({ school }) => ({
      slug: school.slug,
      name: school.name,
    })),
    school:
      ctx.school === null
        ? null
        : {
            slug: ctx.school.slug,
            name: ctx.school.name,
            status: ctx.school.status,
          },
    isStaffHere:
      here !== undefined &&
      (here.hasCustomRole || here.roles.some((role) => role !== "guardian")),
    isGuardianHere: here?.roles.includes("guardian") ?? false,
    permissions:
      ctx.actor.kind === "user" ? [...ctx.actor.permissions].map(String) : [],
  }
}
