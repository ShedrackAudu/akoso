// A school's custom roles, and which built-in roles it says must use a second step
// (spec: stage-1-sign-in-part-b.md, section 2).
import type { z } from "zod"

import { sql, withTenant } from "@akoso/db"
import type {
  archiveCustomRoleInput,
  customRoleRefInput,
  saveCustomRoleInput,
  setSchoolMfaRolesInput,
} from "@akoso/schemas/identity"
import type { ActionKey } from "@akoso/schemas/api"
import {
  CUSTOM_ROLE_ACTIONS,
  RESTRICTED_ACTIONS,
  ROLE_LABELS,
} from "@akoso/schemas/permissions"
import { SCHOOL_SETTINGS } from "@akoso/schemas/school-settings"

import { diffForAudit, recordAudit } from "../audit/index"
import {
  authorize,
  ForbiddenError,
  NotFoundError,
  requireTenant,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { isUniqueViolation, revokeSessions, userIdOf } from "./guards"

export interface CustomRole {
  id: string
  name: string
  description: string
  permissions: string[]
  requiresMfa: boolean
  archived: boolean
  /** How many people hold it. */
  holders: number
  /** It holds a restricted permission, approved by a proprietor. */
  restrictedApproved: boolean
}

const textArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : []

function toRole(row: Record<string, unknown>): CustomRole {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    permissions: textArray(row.permissions),
    requiresMfa: row.requires_mfa === true,
    archived: row.archived_at !== null,
    holders: Number(row.holders ?? 0),
    restrictedApproved: row.restricted_approved_at !== null,
  }
}

const roleQuery = (tenantId: string) => sql`
  select r.*, (select count(*)::int from platform.membership_custom_roles mc
               join platform.memberships m
                 on m.id = mc.membership_id and m.tenant_id = mc.tenant_id
               where mc.tenant_id = r.tenant_id and mc.custom_role_id = r.id
                 and m.status <> 'ended') as holders
  from platform.custom_roles r where r.tenant_id = ${tenantId}`

/** Managing roles, or giving them to people, needs the list. */
function authorizeRoleReader(ctx: RequestContext): void {
  try {
    authorize(ctx, "identity.role.manage")
  } catch {
    authorize(ctx, "identity.member.read")
  }
}

export async function listCustomRoles(
  ctx: RequestContext
): Promise<CustomRole[]> {
  authorizeRoleReader(ctx)
  const tenantId = requireTenant(ctx)
  const rows = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(
      sql`${roleQuery(tenantId)} order by r.archived_at nulls first, lower(r.name)`
    )
    return result.rows
  })
  return rows.map(toRole)
}

const BUILT_IN_NAMES = new Set(
  Object.values(ROLE_LABELS).map((label) => label.toLowerCase())
)

export async function saveCustomRole(
  ctx: RequestContext,
  input: z.output<typeof saveCustomRoleInput>
): Promise<CustomRole> {
  authorize(ctx, "identity.role.manage")
  const tenantId = requireTenant(ctx)
  const actorId = userIdOf(ctx)
  if (BUILT_IN_NAMES.has(input.name.toLowerCase())) {
    throw ValidationError.of("name", "That name belongs to a built-in role")
  }
  const permissions = [...new Set(input.permissions)].sort()
  const offered = new Set<string>(CUSTOM_ROLE_ACTIONS)
  if (permissions.some((permission) => !offered.has(permission))) {
    throw ValidationError.of(
      "permissions",
      "Choose permissions from the list. Some can never go into a custom role."
    )
  }
  const held =
    ctx.actor.kind === "user"
      ? (ctx.actor.permissions as ReadonlySet<string>)
      : new Set<string>()
  const isProprietor = held.has("identity.role.approve_restricted")

  try {
    const saved = await withTenant(ctx.db, tenantId, async (tx) => {
      let before: CustomRole | null = null
      if (input.id !== undefined) {
        const found = await tx.execute(
          sql`${roleQuery(tenantId)} and r.id = ${input.id} for update of r`
        )
        if (found.rows[0] === undefined) throw new NotFoundError()
        before = toRole(found.rows[0])
      }
      const added = permissions.filter(
        (permission) => !(before?.permissions ?? []).includes(permission)
      )
      // Restricted permissions need the proprietor (brief 6).
      if (
        added.some((permission) =>
          RESTRICTED_ACTIONS.has(permission as ActionKey)
        ) &&
        !isProprietor
      ) {
        throw ValidationError.of(
          "permissions",
          "Only the proprietor can add this permission."
        )
      }
      // Anyone else puts in only what they hold, or a role's holders would gain it.
      if (!isProprietor && added.some((permission) => !held.has(permission))) {
        throw ValidationError.of(
          "permissions",
          "You can only add permissions you have yourself."
        )
      }
      const hasRestricted = permissions.some((permission) =>
        RESTRICTED_ACTIONS.has(permission as ActionKey)
      )
      const approve =
        hasRestricted &&
        added.some((p) => RESTRICTED_ACTIONS.has(p as ActionKey))

      const result =
        before === null
          ? await tx.execute(sql`
              insert into platform.custom_roles
                (tenant_id, name, description, permissions, requires_mfa, created_by,
                 restricted_approved_by, restricted_approved_at)
              values (${tenantId}, ${input.name}, ${input.description},
                      ${sql.param(permissions)}::text[], ${input.requiresMfa}, ${actorId},
                      ${approve ? actorId : null}, ${approve ? ctx.now().toISOString() : null})
              returning id`)
          : await tx.execute(sql`
              update platform.custom_roles
              set name = ${input.name}, description = ${input.description},
                  permissions = ${sql.param(permissions)}::text[], requires_mfa = ${input.requiresMfa},
                  restricted_approved_by = case when ${hasRestricted}
                    then coalesce(${approve ? actorId : null}::uuid, restricted_approved_by) end,
                  restricted_approved_at = case when ${hasRestricted}
                    then coalesce(${approve ? ctx.now().toISOString() : null}::timestamptz,
                                  restricted_approved_at) end,
                  updated_at = now()
              where tenant_id = ${tenantId} and id = ${before.id}
              returning id`)
      const id = String(result.rows[0]?.id)
      await recordAudit(tx, ctx, {
        action: before === null ? "custom_role.created" : "custom_role.changed",
        entityType: "custom_role",
        entityId: id,
        changes: diffForAudit(
          before === null
            ? null
            : {
                name: before.name,
                description: before.description,
                permissions: before.permissions,
                requiresMfa: before.requiresMfa,
              },
          {
            name: input.name,
            description: input.description,
            permissions,
            requiresMfa: input.requiresMfa,
          }
        ),
      })
      // What its holders may do changed: sign them out (section 2).
      const changedAccess =
        before !== null &&
        (before.requiresMfa !== input.requiresMfa ||
          before.permissions.join() !== permissions.join())
      const holders = changedAccess
        ? (
            await tx.execute(sql`
              select m.user_id from platform.membership_custom_roles mc
              join platform.memberships m
                on m.id = mc.membership_id and m.tenant_id = mc.tenant_id
              where mc.tenant_id = ${tenantId} and mc.custom_role_id = ${id}`)
          ).rows.map((row) => String(row.user_id))
        : []
      return { id, holders }
    })
    for (const userId of saved.holders) await revokeSessions(ctx.db, userId)
    const roles = await listCustomRoles(ctx)
    const role = roles.find((candidate) => candidate.id === saved.id)
    if (role === undefined) throw new NotFoundError()
    return role
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw ValidationError.of("name", "A role with this name already exists")
    }
    throw error
  }
}

/** Archiving hides a role from new assignments; holders keep it (section 2). */
export async function archiveCustomRole(
  ctx: RequestContext,
  input: z.output<typeof archiveCustomRoleInput>
): Promise<void> {
  authorize(ctx, "identity.role.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      update platform.custom_roles
      set archived_at = ${input.archived ? ctx.now().toISOString() : null}, updated_at = now()
      where tenant_id = ${tenantId} and id = ${input.id}
      returning id`)
    if (result.rows.length === 0) throw new NotFoundError()
    await recordAudit(tx, ctx, {
      action: input.archived ? "custom_role.archived" : "custom_role.restored",
      entityType: "custom_role",
      entityId: input.id,
    })
  })
}

/** Only a role nobody holds can be deleted; otherwise archive it. */
export async function deleteCustomRole(
  ctx: RequestContext,
  input: z.output<typeof customRoleRefInput>
): Promise<void> {
  authorize(ctx, "identity.role.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const held = await tx.execute(sql`
      select 1 from platform.membership_custom_roles
      where tenant_id = ${tenantId} and custom_role_id = ${input.id} limit 1`)
    if (held.rows.length > 0) {
      throw ValidationError.of(
        "",
        "Someone still has this role. Take it away from them first, or archive it."
      )
    }
    const result = await tx.execute(sql`
      delete from platform.custom_roles
      where tenant_id = ${tenantId} and id = ${input.id} returning name`)
    if (result.rows.length === 0) throw new NotFoundError()
    await recordAudit(tx, ctx, {
      action: "custom_role.deleted",
      entityType: "custom_role",
      entityId: input.id,
    })
  })
}

/** Built-in roles the school says must use a second step, beyond the fixed three. */
export async function getSchoolMfaRoles(
  ctx: RequestContext
): Promise<string[]> {
  authorizeRoleReader(ctx)
  const tenantId = requireTenant(ctx)
  const setting = SCHOOL_SETTINGS["security.mfa_roles"]
  const stored = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      select value from platform.school_settings
      where tenant_id = ${tenantId} and key = 'security.mfa_roles'`)
    return result.rows[0]?.value
  })
  const parsed = setting.schema.safeParse(stored)
  return parsed.success ? parsed.data : [...setting.default]
}

export async function setSchoolMfaRoles(
  ctx: RequestContext,
  input: z.output<typeof setSchoolMfaRolesInput>
): Promise<void> {
  authorize(ctx, "identity.role.manage")
  const tenantId = requireTenant(ctx)
  if (ctx.actor.kind !== "user") throw new ForbiddenError()
  const before = await getSchoolMfaRoles(ctx)
  const roles = [...new Set(input.roles)].sort()
  await withTenant(ctx.db, tenantId, async (tx) => {
    await tx.execute(sql`
      insert into platform.school_settings (tenant_id, key, value, updated_by)
      values (${tenantId}, 'security.mfa_roles', ${JSON.stringify(roles)}::jsonb,
              ${`user:${userIdOf(ctx)}`})
      on conflict (tenant_id, key)
      do update set value = excluded.value, updated_at = now(),
                    updated_by = excluded.updated_by`)
    await recordAudit(tx, ctx, {
      action: "school_setting.changed",
      entityType: "school_setting",
      entityId: "security.mfa_roles",
      changes: diffForAudit({ roles: before }, { roles }),
    })
  })
}
