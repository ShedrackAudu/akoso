// The proprietor's security log and the access review (spec: stage-1-sign-in-part-b.md,
// section 3). The log is read only through platform.school_security_log(), which takes
// the school from the transaction's tenant setting.
import { z } from "zod"

import { sql, withTenant } from "@akoso/db"
import type { readSecurityLogInput } from "@akoso/schemas/identity"
import type { ActionKey } from "@akoso/schemas/api"
import {
  ELEVATED_ROLES,
  isRoleKey,
  RESTRICTED_ACTIONS,
  ROLE_LABELS,
  type RoleKey,
} from "@akoso/schemas/permissions"

import {
  authorize,
  decodeCursor,
  encodeCursor,
  requireTenant,
  type RequestContext,
} from "../kernel/index"
import type { SecurityEventKind } from "./events"
import { isoOrNull, textOrNull } from "./guards"

export type DeviceKind = "phone" | "tablet" | "computer" | "unknown"

export interface SecurityLogEntry {
  id: string
  /** ISO time; screens show it in the school's time zone. */
  at: string
  userId: string | null
  name: string
  kind: SecurityEventKind
  detail: string | null
  device: DeviceKind
  ipAddress: string | null
  /** The school caused it (a number change, a suspension), not the person. */
  causedBySchool: boolean
}

const PAGE_SIZE = 50
const positionSchema = z.object({ at: z.string(), id: z.uuid() })

/** A rough device kind from a user agent: all the log needs to show. */
export function deviceKind(userAgent: string | null): DeviceKind {
  if (userAgent === null || userAgent === "") return "unknown"
  if (/iPad|Tablet/i.test(userAgent)) return "tablet"
  if (/Mobi|Android|iPhone/i.test(userAgent)) return "phone"
  if (/Windows|Macintosh|Linux|CrOS/i.test(userAgent)) return "computer"
  return "unknown"
}

export async function readSecurityLog(
  ctx: RequestContext,
  input: z.output<typeof readSecurityLogInput>
): Promise<{ data: SecurityLogEntry[]; nextCursor: string | null }> {
  authorize(ctx, "identity.security_log.read")
  const tenantId = requireTenant(ctx)
  const after =
    input.cursor === undefined
      ? null
      : decodeCursor(input.cursor, positionSchema)
  const rows = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      select * from platform.school_security_log(
        ${PAGE_SIZE + 1}, ${after?.at ?? null}::timestamptz, ${after?.id ?? null}::uuid,
        ${input.userId ?? null}::uuid, ${input.failuresOnly})`)
    return result.rows
  })
  const data = rows.slice(0, PAGE_SIZE).map((row): SecurityLogEntry => ({
    id: String(row.id),
    at: new Date(String(row.created_at)).toISOString(),
    userId: textOrNull(row.user_id),
    name: textOrNull(row.user_name) ?? "Unknown",
    kind: String(row.kind) as SecurityEventKind,
    detail: textOrNull(row.detail),
    device: deviceKind(textOrNull(row.user_agent)),
    ipAddress: textOrNull(row.ip_address),
    causedBySchool: row.caused_by_school === true,
  }))
  const last = data.at(-1)
  return {
    data,
    nextCursor:
      rows.length > PAGE_SIZE && last !== undefined
        ? encodeCursor({ at: last.at, id: last.id })
        : null,
  }
}

export interface AccessReviewRow {
  userId: string
  name: string
  roles: string[]
  status: "active" | "suspended"
  mfaEnabled: boolean
  lastSignInAt: string | null
}

/**
 * Everyone with an elevated role in the school (brief 28's quarterly review): the
 * elevated built-in roles, and any custom role holding a restricted permission.
 */
export async function accessReview(
  ctx: RequestContext
): Promise<AccessReviewRow[]> {
  authorize(ctx, "identity.access_review.read")
  const tenantId = requireTenant(ctx)
  const rows = await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      select m.user_id, u.name, m.roles, m.status, u.two_factor_enabled,
             (select max(e.created_at) from platform.security_events e
              where e.user_id = m.user_id and e.kind = 'sign_in') as last_sign_in_at,
             coalesce((select json_agg(json_build_object('name', r.name,
                                                         'permissions', r.permissions))
                       from platform.membership_custom_roles mc
                       join platform.custom_roles r
                         on r.id = mc.custom_role_id and r.tenant_id = mc.tenant_id
                       where mc.tenant_id = m.tenant_id and mc.membership_id = m.id),
                      '[]'::json) as custom_roles
      from platform.memberships m
      join platform.users u on u.id = m.user_id
      where m.tenant_id = ${tenantId} and m.status <> 'ended'
      order by lower(u.name)`)
    return result.rows
  })
  const review: AccessReviewRow[] = []
  for (const row of rows) {
    const roles = (row.roles as string[]).filter(isRoleKey)
    const custom = row.custom_roles as { name: string; permissions: string[] }[]
    const elevatedCustom = custom.filter((role) =>
      role.permissions.some((permission) =>
        RESTRICTED_ACTIONS.has(permission as ActionKey)
      )
    )
    if (
      !roles.some((role) => ELEVATED_ROLES.has(role)) &&
      elevatedCustom.length === 0
    ) {
      continue
    }
    review.push({
      userId: String(row.user_id),
      name: String(row.name),
      roles: [
        ...roles.map((role: RoleKey) => ROLE_LABELS[role]),
        ...custom.map((role) => role.name),
      ],
      status: row.status === "suspended" ? "suspended" : "active",
      mfaEnabled: row.two_factor_enabled === true,
      lastSignInAt: isoOrNull(row.last_sign_in_at),
    })
  }
  return review
}

/** One CSV field, quoted, and safe to open in a spreadsheet (no formulas). */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

/** The access review as CSV, times as given (ISO, UTC). */
export function accessReviewCsv(rows: readonly AccessReviewRow[]): string {
  const header = [
    "Name",
    "Roles",
    "Status",
    "Second step",
    "Last sign-in (UTC)",
  ]
  const lines = rows.map((row) =>
    [
      row.name,
      row.roles.join("; "),
      row.status === "active" ? "Active" : "Suspended",
      row.mfaEnabled ? "On" : "Off",
      row.lastSignInAt ?? "Never",
    ]
      .map(csvField)
      .join(",")
  )
  return [header.map(csvField).join(","), ...lines].join("\r\n") + "\r\n"
}
