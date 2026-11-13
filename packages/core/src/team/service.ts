// Akoso team use cases (spec: docs/specs/stage-1-sign-in-part-b.md, section 8):
// enrolment, recovery codes, passkeys, and the Owner's management of the team.
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"

import type { z } from "zod"

import { sql } from "@akoso/db"
import { isTeamRoleKey, type TeamRoleKey } from "@akoso/schemas/permissions"
import type {
  changeTeamRolesInput,
  deletePasskeyInput,
  inviteTeamMemberInput,
  readTeamSecurityLogInput,
  removeTeamMemberInput,
  startEnrolmentInput,
  startRecoveryInput,
} from "@akoso/schemas/team"
import { z as zod } from "zod"

import {
  consumeLimits,
  decodeCursor,
  encodeCursor,
  NotFoundError,
  ValidationError,
} from "../kernel/index"
import { recordTeamAudit } from "./audit"
import { adminOrigins } from "./auth"
import {
  authorizeTeam,
  requireRecentTeamSignIn,
  type TeamBase,
  type TeamContext,
} from "./context"
import { recordTeamSecurityEvent, type TeamSecurityEventKind } from "./events"
import { teamSettings } from "./instance"
import { issueTicket } from "./tickets"

const refuse = (message: string) => ValidationError.of("", message)

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex")

// Enrolment and recovery: each ends in a ticket to register a passkey.

/** Opening an enrolment link: uses up the link, returns a 10-minute ticket. */
export async function startEnrolment(
  base: TeamBase,
  input: z.output<typeof startEnrolmentInput>
): Promise<{ ticket: string; email: string }> {
  const result = await base.db.execute(sql`
    update platform.team_invitations i set used_at = now()
    from platform.team_users u
    where i.token_hash = ${sha256(input.token)} and i.used_at is null
      and i.expires_at > ${base.now().toISOString()}
      and u.id = i.user_id and u.removed_at is null
    returning i.user_id, u.email`)
  const row = result.rows[0]
  if (row === undefined) {
    throw refuse(
      "This link doesn't work. It may be used or old. Ask the Owner for a new one."
    )
  }
  return {
    ticket: await issueTicket(
      base.db,
      String(row.user_id),
      "enrol",
      base.now()
    ),
    email: String(row.email),
  }
}

const RECOVERY_CODE_COUNT = 10
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"

const normaliseCode = (code: string): string =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, "")

const hashCode = (hashKey: string, userId: string, code: string): string =>
  createHmac("sha256", hashKey)
    .update(`${userId}\n${normaliseCode(code)}`)
    .digest("hex")

/** Ten characters, each chosen uniformly (randomInt has no modulo bias). */
function newRecoveryCode(): string {
  let code = ""
  for (let index = 0; index < 10; index++) {
    code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length))
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`
}

/**
 * A recovery code: used once, it gives a ticket to register a new passkey. The same
 * refusal for an unknown email, a removed member and a wrong or used code.
 */
export async function startRecovery(
  base: TeamBase,
  input: z.output<typeof startRecoveryInput>,
  ipAddress: string | null
): Promise<{ ticket: string }> {
  await consumeLimits(
    base.db,
    [
      {
        key: `team-recovery:email:${input.email}`,
        limit: 5,
        windowSeconds: 15 * 60,
      },
      {
        key: `team-recovery:ip:${ipAddress ?? "unknown"}`,
        limit: 20,
        windowSeconds: 60 * 60,
      },
    ],
    () => base.now()
  )
  const wrong = () => refuse("That email or recovery code isn't right.")
  const user = await base.db.execute(sql`
    select id from platform.team_users where email = ${input.email} and removed_at is null`)
  const userId = user.rows[0] === undefined ? null : String(user.rows[0].id)
  if (userId === null) throw wrong()
  const { hashKey } = teamSettings()
  const typed = Buffer.from(hashCode(hashKey, userId, input.code), "hex")
  const codes = await base.db.execute(sql`
    select id, code_hash from platform.team_recovery_codes
    where user_id = ${userId} and used_at is null`)
  const match = codes.rows.find((row) => {
    const stored = Buffer.from(String(row.code_hash), "hex")
    return stored.length === typed.length && timingSafeEqual(stored, typed)
  })
  if (match === undefined) throw wrong()
  const used = await base.db.execute(sql`
    update platform.team_recovery_codes set used_at = now()
    where id = ${String(match.id)} and used_at is null returning id`)
  if (used.rows.length === 0) throw wrong()
  await recordTeamSecurityEvent(base.db, {
    userId,
    kind: "recovery_code_used",
    ipAddress,
  })
  await recordTeamAudit(base.db, {
    actorId: userId,
    action: "team.recovery_code.used",
    entityType: "team_user",
    entityId: userId,
    requestId: base.requestId,
  })
  return { ticket: await issueTicket(base.db, userId, "recovery", base.now()) }
}

/**
 * New recovery codes, shown once. Allowed straight after enrolling (no codes yet) or
 * with a recent sign-in; replaces any earlier codes.
 */
export async function createRecoveryCodes(
  ctx: TeamContext
): Promise<{ codes: string[] }> {
  const { userId } = ctx.member
  const existing = await ctx.db.execute(sql`
    select count(*)::int as n from platform.team_recovery_codes where user_id = ${userId}`)
  if (Number(existing.rows[0]?.n ?? 0) > 0) requireRecentTeamSignIn(ctx)
  const { hashKey } = teamSettings()
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  await ctx.db.transaction(async (tx) => {
    await tx.execute(
      sql`delete from platform.team_recovery_codes where user_id = ${userId}`
    )
    for (const code of codes) {
      await tx.execute(sql`
        insert into platform.team_recovery_codes (user_id, code_hash)
        values (${userId}, ${hashCode(hashKey, userId, code)})`)
    }
    await recordTeamSecurityEvent(tx, {
      userId,
      kind: "recovery_codes_created",
    })
    await recordTeamAudit(tx, {
      actorId: userId,
      action: "team.recovery_codes.created",
      entityType: "team_user",
      entityId: userId,
      requestId: ctx.requestId,
    })
  })
  return { codes }
}

// My security: passkeys and recovery codes.

export interface MyTeamSecurity {
  passkeys: { id: string; name: string; createdAt: string }[]
  recoveryCodesLeft: number
}

export async function getMyTeamSecurity(
  ctx: TeamContext
): Promise<MyTeamSecurity> {
  const { userId } = ctx.member
  const passkeys = await ctx.db.execute(sql`
    select id, name, created_at from platform.team_passkeys
    where user_id = ${userId} order by created_at`)
  const codes = await ctx.db.execute(sql`
    select count(*)::int as n from platform.team_recovery_codes
    where user_id = ${userId} and used_at is null`)
  return {
    passkeys: passkeys.rows.map((row) => ({
      id: String(row.id),
      name:
        typeof row.name === "string" && row.name !== "" ? row.name : "Passkey",
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
    recoveryCodesLeft: Number(codes.rows[0]?.n ?? 0),
  }
}

export async function deleteMyPasskey(
  ctx: TeamContext,
  input: z.output<typeof deletePasskeyInput>
): Promise<void> {
  requireRecentTeamSignIn(ctx)
  const { userId } = ctx.member
  await ctx.db.transaction(async (tx) => {
    const count = await tx.execute(sql`
      select count(*)::int as n from platform.team_passkeys where user_id = ${userId}`)
    if (Number(count.rows[0]?.n ?? 0) <= 1) {
      throw refuse("Add another passkey before removing your last one.")
    }
    const removed = await tx.execute(sql`
      delete from platform.team_passkeys
      where id = ${input.id} and user_id = ${userId} returning id`)
    if (removed.rows.length === 0) throw new NotFoundError()
    await recordTeamSecurityEvent(tx, { userId, kind: "passkey_removed" })
    await recordTeamAudit(tx, {
      actorId: userId,
      action: "team.passkey.removed",
      entityType: "team_user",
      entityId: userId,
      requestId: ctx.requestId,
    })
  })
}

// The team, for the Owner.

export interface TeamMemberSummary {
  userId: string
  name: string
  email: string
  roles: TeamRoleKey[]
  /** Has registered a passkey; false while an invitation is outstanding. */
  enrolled: boolean
  passkeys: number
  lastSignInAt: string | null
  removed: boolean
}

const memberQuery = sql`
  select u.id, u.name, u.email, u.removed_at,
         coalesce(array(select g.role from platform.team_role_grants g
                        where g.user_id = u.id order by g.role), '{}') as roles,
         (select count(*)::int from platform.team_passkeys p where p.user_id = u.id) as passkeys,
         (select max(e.created_at) from platform.team_security_events e
          where e.user_id = u.id and e.kind = 'sign_in') as last_sign_in_at
  from platform.team_users u`

function toMember(row: Record<string, unknown>): TeamMemberSummary {
  return {
    userId: String(row.id),
    name: String(row.name),
    email: String(row.email),
    roles: (row.roles as string[]).filter(isTeamRoleKey),
    enrolled: Number(row.passkeys) > 0,
    passkeys: Number(row.passkeys),
    lastSignInAt:
      typeof row.last_sign_in_at === "string"
        ? new Date(row.last_sign_in_at).toISOString()
        : null,
    removed: row.removed_at !== null,
  }
}

export async function listTeamMembers(
  ctx: TeamContext
): Promise<TeamMemberSummary[]> {
  authorizeTeam(ctx, "team.member.read")
  const result = await ctx.db.execute(
    sql`${memberQuery} order by u.removed_at nulls first, lower(u.name)`
  )
  return result.rows.map(toMember)
}

export async function getTeamMember(
  ctx: TeamContext,
  userId: string
): Promise<TeamMemberSummary> {
  authorizeTeam(ctx, "team.member.read")
  const result = await ctx.db.execute(
    sql`${memberQuery} where u.id = ${userId}`
  )
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  return toMember(row)
}

/** The admin address's enrolment link for a token. */
function enrolmentLink(token: string): string {
  const origin = adminOrigins(teamSettings().baseDomain)[0] ?? ""
  return `${origin}/enrol?token=${encodeURIComponent(token)}`
}

/** Typed confirmation while the Owner works alone (brief 26.2). */
function requireTypedEmail(email: string, typed: string): void {
  if (typed !== email) {
    throw ValidationError.of(
      "confirmEmail",
      "Type the person's email exactly to confirm this Owner change."
    )
  }
}

async function activeOwnersOtherThan(
  ctx: TeamContext,
  userId: string
): Promise<number> {
  const result = await ctx.db.execute(sql`
    select count(*)::int as n from platform.team_role_grants g
    join platform.team_users u on u.id = g.user_id
    where g.role = 'owner' and u.removed_at is null and u.id <> ${userId}`)
  return Number(result.rows[0]?.n ?? 0)
}

/**
 * Invites someone with roles: returns the single-use enrolment link (24 hours), shown
 * once for the Owner to pass on. A removed member can be invited again.
 */
export async function inviteTeamMember(
  ctx: TeamContext,
  input: z.output<typeof inviteTeamMemberInput>
): Promise<{ link: string }> {
  authorizeTeam(ctx, "team.member.manage")
  requireRecentTeamSignIn(ctx)
  const roles = [...new Set(input.roles)].sort()
  if (roles.includes("owner"))
    requireTypedEmail(input.email, input.confirmEmail)
  const token = randomBytes(32).toString("base64url")
  const actorId = ctx.member.userId

  await ctx.db.transaction(async (tx) => {
    const existing = await tx.execute(sql`
      select id, removed_at from platform.team_users where email = ${input.email} for update`)
    let id: string
    if (existing.rows[0] === undefined) {
      id = randomUUID()
      await tx.execute(sql`
        insert into platform.team_users (id, name, email)
        values (${id}, ${input.name}, ${input.email})`)
    } else if (existing.rows[0].removed_at === null) {
      throw ValidationError.of("email", "This person is already on the team.")
    } else {
      id = String(existing.rows[0].id)
      await tx.execute(sql`
        update platform.team_users set name = ${input.name}, removed_at = null, updated_at = now()
        where id = ${id}`)
    }
    await tx.execute(
      sql`delete from platform.team_role_grants where user_id = ${id}`
    )
    for (const role of roles) {
      await tx.execute(sql`
        insert into platform.team_role_grants (user_id, role, granted_by)
        values (${id}, ${role}, ${actorId})`)
    }
    await tx.execute(sql`
      insert into platform.team_invitations (user_id, token_hash, expires_at, created_by)
      values (${id}, ${sha256(token)},
              ${new Date(ctx.now().getTime() + 24 * 60 * 60 * 1000).toISOString()}, ${actorId})`)
    await recordTeamAudit(tx, {
      actorId,
      action: "team.member.invited",
      entityType: "team_user",
      entityId: id,
      changes: { roles: { before: null, after: roles } },
      requestId: ctx.requestId,
    })
  })
  return { link: enrolmentLink(token) }
}

async function revokeTeamSessions(
  ctx: TeamContext,
  userId: string,
  kind: TeamSecurityEventKind
): Promise<void> {
  await ctx.db.execute(
    sql`delete from platform.team_sessions where user_id = ${userId}`
  )
  await recordTeamSecurityEvent(ctx.db, { userId, kind })
}

export async function changeTeamRoles(
  ctx: TeamContext,
  input: z.output<typeof changeTeamRolesInput>
): Promise<TeamMemberSummary> {
  authorizeTeam(ctx, "team.member.manage")
  requireRecentTeamSignIn(ctx)
  if (input.userId === ctx.member.userId) {
    throw refuse("You can't change your own roles. Ask another Owner.")
  }
  const before = await getTeamMember(ctx, input.userId)
  if (before.removed) throw new NotFoundError()
  const roles = [...new Set(input.roles)].sort()
  const touchesOwner =
    before.roles.includes("owner") !== roles.includes("owner")
  if (touchesOwner) requireTypedEmail(before.email, input.confirmEmail)
  if (
    before.roles.includes("owner") &&
    !roles.includes("owner") &&
    (await activeOwnersOtherThan(ctx, before.userId)) === 0
  ) {
    throw refuse("The team must keep at least one Owner.")
  }
  await ctx.db.transaction(async (tx) => {
    await tx.execute(
      sql`delete from platform.team_role_grants where user_id = ${before.userId}`
    )
    for (const role of roles) {
      await tx.execute(sql`
        insert into platform.team_role_grants (user_id, role, granted_by)
        values (${before.userId}, ${role}, ${ctx.member.userId})`)
    }
    await recordTeamAudit(tx, {
      actorId: ctx.member.userId,
      action: "team.member.roles_changed",
      entityType: "team_user",
      entityId: before.userId,
      changes: { roles: { before: before.roles, after: roles } },
      requestId: ctx.requestId,
    })
  })
  await revokeTeamSessions(ctx, before.userId, "roles_changed")
  return getTeamMember(ctx, before.userId)
}

/**
 * Offboarding (brief 26.2): access ends at once. Sessions, passkeys, recovery codes
 * and unused invitations are removed; the record stays for the audit log.
 */
export async function removeTeamMember(
  ctx: TeamContext,
  input: z.output<typeof removeTeamMemberInput>
): Promise<void> {
  authorizeTeam(ctx, "team.member.manage")
  requireRecentTeamSignIn(ctx)
  if (input.userId === ctx.member.userId) {
    throw refuse("You can't remove your own access. Ask another Owner.")
  }
  const before = await getTeamMember(ctx, input.userId)
  if (before.removed) return
  if (before.roles.includes("owner")) {
    requireTypedEmail(before.email, input.confirmEmail)
    if ((await activeOwnersOtherThan(ctx, before.userId)) === 0) {
      throw refuse("The team's last Owner can't be removed.")
    }
  }
  await ctx.db.transaction(async (tx) => {
    for (const table of [
      "team_sessions",
      "team_passkeys",
      "team_recovery_codes",
      "team_role_grants",
    ] as const) {
      await tx.execute(
        sql`delete from ${sql.raw(`platform.${table}`)} where user_id = ${before.userId}`
      )
    }
    await tx.execute(sql`
      update platform.team_invitations set used_at = now()
      where user_id = ${before.userId} and used_at is null`)
    await tx.execute(sql`
      update platform.team_users set removed_at = now(), updated_at = now()
      where id = ${before.userId}`)
    await recordTeamSecurityEvent(tx, {
      userId: before.userId,
      kind: "access_removed",
    })
    await recordTeamAudit(tx, {
      actorId: ctx.member.userId,
      action: "team.member.removed",
      entityType: "team_user",
      entityId: before.userId,
      changes: { roles: { before: before.roles, after: [] } },
      requestId: ctx.requestId,
    })
  })
}

// The team security log, for the Owner.

export interface TeamSecurityLogEntry {
  id: string
  at: string
  userId: string | null
  name: string
  kind: TeamSecurityEventKind
  detail: string | null
  ipAddress: string | null
}

const positionSchema = zod.object({ at: zod.string(), id: zod.uuid() })
const PAGE_SIZE = 50

export async function readTeamSecurityLog(
  ctx: TeamContext,
  input: z.output<typeof readTeamSecurityLogInput>
): Promise<{ data: TeamSecurityLogEntry[]; nextCursor: string | null }> {
  authorizeTeam(ctx, "team.security_log.read")
  const after =
    input.cursor === undefined
      ? null
      : decodeCursor(input.cursor, positionSchema)
  const page =
    after === null
      ? sql`true`
      : sql`(e.created_at, e.id) < (${after.at}::timestamptz, ${after.id}::uuid)`
  const result = await ctx.db.execute(sql`
    select e.id, e.created_at, e.user_id, u.name, e.kind, e.detail, e.ip_address
    from platform.team_security_events e
    left join platform.team_users u on u.id = e.user_id
    where ${page}
    order by e.created_at desc, e.id desc
    limit ${PAGE_SIZE + 1}`)
  const data = result.rows
    .slice(0, PAGE_SIZE)
    .map((row): TeamSecurityLogEntry => ({
      id: String(row.id),
      at: new Date(String(row.created_at)).toISOString(),
      userId: typeof row.user_id === "string" ? row.user_id : null,
      name: typeof row.name === "string" ? row.name : "Unknown",
      kind: String(row.kind) as TeamSecurityEventKind,
      detail: typeof row.detail === "string" ? row.detail : null,
      ipAddress: typeof row.ip_address === "string" ? row.ip_address : null,
    }))
  const last = data.at(-1)
  return {
    data,
    nextCursor:
      result.rows.length > PAGE_SIZE && last !== undefined
        ? encodeCursor({ at: last.at, id: last.id })
        : null,
  }
}

/** Recovery codes used in the last 30 days: an alert on the Owner's home page. */
export async function recentRecoveryUses(
  ctx: TeamContext
): Promise<{ name: string; at: string }[]> {
  authorizeTeam(ctx, "team.security_log.read")
  const result = await ctx.db.execute(sql`
    select u.name, e.created_at from platform.team_security_events e
    join platform.team_users u on u.id = e.user_id
    where e.kind = 'recovery_code_used'
      and e.created_at > ${new Date(ctx.now().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}
    order by e.created_at desc`)
  return result.rows.map((row) => ({
    name: String(row.name),
    at: new Date(String(row.created_at)).toISOString(),
  }))
}
