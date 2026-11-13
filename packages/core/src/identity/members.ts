// People with access to a school: listing them, changing their roles, suspending them
// (spec: stage-1-sign-in-part-b.md, section 1). Every change is audit-logged, recorded
// as a security event and signs the person out.
import type { z } from "zod"

import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import type {
  changeMemberRolesInput,
  listMembersInput,
  setMembershipStatusInput,
} from "@akoso/schemas/identity"
import {
  isRoleKey,
  PROPRIETOR_GRANTED_ROLES,
  ROLE_PERMISSIONS,
  type RoleKey,
} from "@akoso/schemas/permissions"

import { diffForAudit, recordAudit } from "../audit/index"
import {
  authorize,
  decodeCursor,
  encodeCursor,
  NotFoundError,
  requireTenant,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { z as zod } from "zod"
import { recordSecurityEvent } from "./events"
import {
  actorHolds,
  isoOrNull,
  requireRecentSignIn,
  revokeSessions,
  userIdOf,
} from "./guards"

export interface CustomRoleRef {
  id: string
  name: string
}

export interface MemberSummary {
  membershipId: string
  userId: string
  name: string
  roles: RoleKey[]
  customRoles: CustomRoleRef[]
  status: "active" | "suspended"
  mfaEnabled: boolean
  /** ISO time of the last sign-in, or null if never. */
  lastSignInAt: string | null
  /** Works for the school: a role other than parent, or any custom role. */
  isStaff: boolean
}

const PAGE_SIZE = 50
const positionSchema = zod.object({ name: zod.string(), id: zod.uuid() })

const textArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : []

function toSummary(row: Record<string, unknown>): MemberSummary {
  const roles = textArray(row.roles).filter(isRoleKey)
  const customRoles = Array.isArray(row.custom_roles)
    ? (row.custom_roles as { id: string; name: string }[])
    : []
  return {
    membershipId: String(row.membership_id),
    userId: String(row.user_id),
    name: String(row.name),
    roles,
    customRoles,
    status: row.status === "suspended" ? "suspended" : "active",
    mfaEnabled: row.two_factor_enabled === true,
    lastSignInAt: isoOrNull(row.last_sign_in_at),
    isStaff:
      customRoles.length > 0 || roles.some((role) => role !== "guardian"),
  }
}

/** One membership in the school, with the person's details. */
const memberQuery = (where: ReturnType<typeof sql>) => sql`
  select m.id as membership_id, m.user_id, m.roles, m.status, u.name,
         u.two_factor_enabled,
         (select max(e.created_at) from platform.security_events e
          where e.user_id = m.user_id and e.kind = 'sign_in') as last_sign_in_at,
         coalesce((select json_agg(json_build_object('id', r.id, 'name', r.name)
                                   order by r.name)
                   from platform.membership_custom_roles mc
                   join platform.custom_roles r
                     on r.id = mc.custom_role_id and r.tenant_id = mc.tenant_id
                   where mc.tenant_id = m.tenant_id and mc.membership_id = m.id),
                  '[]'::json) as custom_roles
  from platform.memberships m
  join platform.users u on u.id = m.user_id
  where m.status <> 'ended' and ${where}`

/** The school's people, staff first by default; guardians come in pages. */
export async function listMembers(
  ctx: RequestContext,
  input: z.output<typeof listMembersInput>
): Promise<{ data: MemberSummary[]; nextCursor: string | null }> {
  authorize(ctx, "identity.member.read")
  const tenantId = requireTenant(ctx)
  const after =
    input.cursor === undefined
      ? null
      : decodeCursor(input.cursor, positionSchema)
  const isStaff = sql`(exists (select 1 from unnest(m.roles) as r where r <> 'guardian')
      or exists (select 1 from platform.membership_custom_roles mc
                 where mc.tenant_id = m.tenant_id and mc.membership_id = m.id))`
  const filter =
    input.filter === "staff"
      ? isStaff
      : input.filter === "guardians"
        ? sql`not ${isStaff}`
        : sql`true`
  const search =
    input.search === ""
      ? sql`true`
      : sql`u.name ilike ${`%${input.search.replace(/[\\%_]/g, "\\$&")}%`}`
  const page =
    after === null
      ? sql`true`
      : sql`(lower(u.name), m.id) > (${after.name}, ${after.id})`
  const rows = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      ${memberQuery(sql`m.tenant_id = ${tenantId} and ${filter} and ${search} and ${page}`)}
      order by lower(u.name), m.id
      limit ${PAGE_SIZE + 1}`)
    return result.rows
  })
  const data = rows.slice(0, PAGE_SIZE).map(toSummary)
  const last = data.at(-1)
  return {
    data,
    nextCursor:
      rows.length > PAGE_SIZE && last !== undefined
        ? encodeCursor({ name: last.name.toLowerCase(), id: last.membershipId })
        : null,
  }
}

/** One member of the school. */
export async function getMember(
  ctx: RequestContext,
  membershipId: string
): Promise<MemberSummary> {
  authorize(ctx, "identity.member.read")
  const tenantId = requireTenant(ctx)
  const row = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(
      memberQuery(sql`m.tenant_id = ${tenantId} and m.id = ${membershipId}`)
    )
    return result.rows[0]
  })
  if (row === undefined) throw new NotFoundError()
  return toSummary(row)
}

/** The membership being changed, locked for the change. */
async function lockMember(
  tx: TenantTransaction,
  tenantId: string,
  membershipId: string
): Promise<MemberSummary> {
  await tx.execute(sql`
    select 1 from platform.memberships
    where tenant_id = ${tenantId} and id = ${membershipId} for update`)
  const result = await tx.execute(
    memberQuery(sql`m.tenant_id = ${tenantId} and m.id = ${membershipId}`)
  )
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  return toSummary(row)
}

/** Active proprietors in the school other than this membership. */
async function otherActiveProprietors(
  tx: TenantTransaction,
  tenantId: string,
  membershipId: string
): Promise<number> {
  const result = await tx.execute(sql`
    select count(*)::int as n from platform.memberships
    where tenant_id = ${tenantId} and id <> ${membershipId}
      and status = 'active' and 'proprietor' = any(roles)`)
  return Number(result.rows[0]?.n ?? 0)
}

const refuse = (message: string) => ValidationError.of("", message)

/** Rule 1: nobody changes their own roles or status. */
function refuseOwn(ctx: RequestContext, target: MemberSummary): void {
  if (target.userId === userIdOf(ctx)) {
    throw refuse(
      "You can't change your own access. Ask another proprietor or administrator."
    )
  }
}

/** Rule 2: only a proprietor touches proprietors and administrators. */
function refuseUnlessProprietor(
  ctx: RequestContext,
  roles: Iterable<RoleKey>
): void {
  const needsProprietor = [...roles].some((role) =>
    PROPRIETOR_GRANTED_ROLES.has(role)
  )
  if (needsProprietor && !actorHolds(ctx, "proprietor")) {
    throw refuse(
      "Only a proprietor can change a proprietor's or school administrator's access."
    )
  }
}

/** Rule 3: grant only what you hold yourself (proprietors may grant anything). */
function refuseBeyondOwn(
  ctx: RequestContext,
  permissions: Iterable<string>
): void {
  if (actorHolds(ctx, "proprietor") || ctx.actor.kind !== "user") return
  const held = ctx.actor.permissions as ReadonlySet<string>
  if ([...permissions].some((permission) => !held.has(permission))) {
    throw refuse(
      "You can only give someone a role whose permissions you have yourself."
    )
  }
}

export async function changeMemberRoles(
  ctx: RequestContext,
  input: z.output<typeof changeMemberRolesInput>
): Promise<MemberSummary> {
  authorize(ctx, "identity.member.manage")
  requireRecentSignIn(ctx)
  const tenantId = requireTenant(ctx)
  const roles = [...new Set(input.roles)].sort()
  const customRoleIds = [...new Set(input.customRoleIds)].sort()

  const target = await withTenant(ctx.db, tenantId, async (tx) => {
    const before = await lockMember(tx, tenantId, input.membershipId)
    refuseOwn(ctx, before)

    const added = roles.filter((role) => !before.roles.includes(role))
    const removed = before.roles.filter((role) => !roles.includes(role))
    refuseUnlessProprietor(ctx, [...added, ...removed])

    // Custom roles must be this school's; archived ones can be kept, not newly given.
    const known = await tx.execute(sql`
      select id, name, permissions, archived_at from platform.custom_roles
      where tenant_id = ${tenantId} and id = any(${sql.param(customRoleIds)}::uuid[])`)
    if (known.rows.length !== customRoleIds.length) {
      throw ValidationError.of("customRoleIds", "Choose roles from the list")
    }
    const heldBefore = new Set(before.customRoles.map((role) => role.id))
    const newCustom = known.rows.filter(
      (row) => !heldBefore.has(String(row.id))
    )
    if (newCustom.some((row) => row.archived_at !== null)) {
      throw ValidationError.of(
        "customRoleIds",
        "An archived role can't be given to anyone new"
      )
    }
    refuseBeyondOwn(ctx, [
      ...added.flatMap((role) => ROLE_PERMISSIONS[role]),
      ...newCustom.flatMap((row) => textArray(row.permissions)),
    ])

    // Rule 4: the school keeps at least one active proprietor.
    if (
      removed.includes("proprietor") &&
      before.status === "active" &&
      (await otherActiveProprietors(tx, tenantId, before.membershipId)) === 0
    ) {
      throw refuse(
        "The school must keep at least one active proprietor. Make someone else proprietor first."
      )
    }

    await tx.execute(sql`
      update platform.memberships set roles = ${sql.param(roles)}::text[], updated_at = now()
      where tenant_id = ${tenantId} and id = ${before.membershipId}`)
    await tx.execute(sql`
      delete from platform.membership_custom_roles
      where tenant_id = ${tenantId} and membership_id = ${before.membershipId}
        and not (custom_role_id = any(${sql.param(customRoleIds)}::uuid[]))`)
    for (const id of customRoleIds) {
      await tx.execute(sql`
        insert into platform.membership_custom_roles
          (tenant_id, membership_id, custom_role_id, granted_by)
        values (${tenantId}, ${before.membershipId}, ${id}, ${userIdOf(ctx)})
        on conflict do nothing`)
    }
    await recordAudit(tx, ctx, {
      action: "membership.roles.changed",
      entityType: "membership",
      entityId: before.membershipId,
      changes: diffForAudit(
        {
          roles: before.roles,
          customRoles: before.customRoles.map((role) => role.id).sort(),
        },
        { roles, customRoles: customRoleIds }
      ),
    })
    await recordSecurityEvent(tx, {
      userId: before.userId,
      tenantId,
      kind: "roles_changed",
    })
    return before
  })
  // A change of privilege signs the person out everywhere (brief 6).
  await revokeSessions(ctx.db, target.userId)
  return getMember(ctx, target.membershipId)
}

export async function setMembershipStatus(
  ctx: RequestContext,
  input: z.output<typeof setMembershipStatusInput>
): Promise<MemberSummary> {
  authorize(ctx, "identity.member.manage")
  const tenantId = requireTenant(ctx)
  const target = await withTenant(ctx.db, tenantId, async (tx) => {
    const before = await lockMember(tx, tenantId, input.membershipId)
    refuseOwn(ctx, before)
    refuseUnlessProprietor(ctx, before.roles)
    if (before.status === input.status) return before
    if (
      input.status === "suspended" &&
      before.roles.includes("proprietor") &&
      (await otherActiveProprietors(tx, tenantId, before.membershipId)) === 0
    ) {
      throw refuse("The school's last active proprietor can't be suspended.")
    }
    await tx.execute(sql`
      update platform.memberships set status = ${input.status}, updated_at = now()
      where tenant_id = ${tenantId} and id = ${before.membershipId}`)
    await recordAudit(tx, ctx, {
      action:
        input.status === "suspended"
          ? "membership.suspended"
          : "membership.reactivated",
      entityType: "membership",
      entityId: before.membershipId,
      changes: { status: { before: before.status, after: input.status } },
    })
    await recordSecurityEvent(tx, {
      userId: before.userId,
      tenantId,
      kind:
        input.status === "suspended"
          ? "membership_suspended"
          : "membership_reactivated",
    })
    return before
  })
  if (input.status === "suspended") await revokeSessions(ctx.db, target.userId)
  return getMember(ctx, target.membershipId)
}
