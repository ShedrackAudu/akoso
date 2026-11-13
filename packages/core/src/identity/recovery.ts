// The school helps someone who lost their number or authenticator (spec:
// stage-1-sign-in-part-b.md, sections 5 and 6): a recorded identity check, then a
// number change proved by a code to the new number, or a second-step reset.
import type { z } from "zod"

import { time } from "@akoso/domain"
import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import type {
  confirmNumberChangeInput,
  resetMemberMfaInput,
  startNumberChangeInput,
} from "@akoso/schemas/identity"
import { PROPRIETOR_GRANTED_ROLES, isRoleKey } from "@akoso/schemas/permissions"

import { recordAudit } from "../audit/index"
import {
  authorize,
  getSetting,
  NotFoundError,
  requireTenant,
  schoolToday,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { accessFor } from "./access"
import { recordSecurityEvent } from "./events"
import {
  actorHolds,
  isUniqueViolation,
  numberEnding,
  requireRecentSignIn,
  revokeSessions,
  textOrNull,
  userIdOf,
} from "./guards"
import { getIdentityServices } from "./instance"
import { sendCode, sendNotice } from "./notices"
import { issueCode, useCode } from "./one-time"
import { normalisePhone } from "./phone"

interface Target {
  membershipId: string
  userId: string
  roles: string[]
  phone: string | null
  backupPhone: string | null
  email: string
  mfaEnabled: boolean
}

const refuse = (message: string) => ValidationError.of("", message)

async function loadTarget(
  tx: TenantTransaction,
  tenantId: string,
  membershipId: string
): Promise<Target> {
  const result = await tx.execute(sql`
    select m.id, m.user_id, m.roles, u.phone_number, u.email, u.two_factor_enabled,
           b.phone_number as backup_phone
    from platform.memberships m
    join platform.users u on u.id = m.user_id
    left join platform.user_backup_phones b on b.user_id = u.id
    where m.tenant_id = ${tenantId} and m.id = ${membershipId}
      and m.status <> 'ended' and u.deleted_at is null`)
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  return {
    membershipId: String(row.id),
    userId: String(row.user_id),
    roles: (row.roles as string[]).map(String),
    phone: textOrNull(row.phone_number),
    backupPhone: textOrNull(row.backup_phone),
    email: String(row.email),
    mfaEnabled: row.two_factor_enabled === true,
  }
}

/** Checks every school-assisted change shares (sections 5 and 6). */
async function refuseUnsafe(
  ctx: RequestContext,
  target: Target
): Promise<void> {
  if (target.userId === userIdOf(ctx)) {
    throw refuse("You can't do this for your own account.")
  }
  const managed = target.roles.filter(isRoleKey)
  if (
    managed.some((role) => PROPRIETOR_GRANTED_ROLES.has(role)) &&
    !actorHolds(ctx, "proprietor")
  ) {
    throw refuse(
      "Only a proprietor can do this for a proprietor or school administrator."
    )
  }
  // An account spans schools: another school's access is not this school's to give.
  const access = await accessFor(ctx.db, target.userId)
  if (access.schools.some((school) => school.school.id !== ctx.tenantId)) {
    throw refuse(
      "This person also belongs to another school, so Akoso support must make this change. Please contact Akoso support."
    )
  }
}

/** Number changes completed in a window, for the limits (section 5). */
async function completedChanges(
  tx: TenantTransaction,
  tenantId: string,
  since: Date,
  userId: string | null
): Promise<number> {
  const result = await tx.execute(sql`
    select count(*)::int as n from platform.contact_changes
    where tenant_id = ${tenantId} and kind = 'phone_number' and status = 'done'
      and completed_at > ${since.toISOString()}
      and (${userId}::uuid is null or user_id = ${userId}::uuid)`)
  return Number(result.rows[0]?.n ?? 0)
}

async function refuseOverLimits(
  ctx: RequestContext,
  tx: TenantTransaction,
  tenantId: string,
  userId: string
): Promise<void> {
  const limits = await getSetting(ctx.db, "limits.contact_change")
  const now = ctx.now().getTime()
  const day = new Date(now - 24 * 60 * 60 * 1000)
  const month = new Date(now - 30 * 24 * 60 * 60 * 1000)
  if (
    (await completedChanges(tx, tenantId, day, null)) >= limits.perSchoolPerDay
  ) {
    throw refuse(
      "Your school has changed as many sign-in numbers as it can today. Please try again tomorrow."
    )
  }
  if (
    (await completedChanges(tx, tenantId, month, userId)) >=
    limits.perPersonPer30Days
  ) {
    throw refuse(
      "This person's number was changed recently. Please contact Akoso support to change it again."
    )
  }
}

const numberRefused = () =>
  ValidationError.of(
    "phone",
    "This number can't be used. Ask the person for another."
  )

function parsePhone(typed: string): string {
  const phone = normalisePhone(typed)
  if (phone === null)
    throw ValidationError.of("phone", "Enter a valid phone number")
  return phone
}

/** Step 1: record the identity check and send a code to the new number. */
export async function startNumberChange(
  ctx: RequestContext,
  input: z.output<typeof startNumberChangeInput>
): Promise<{ changeId: string }> {
  authorize(ctx, "identity.contact.change")
  requireRecentSignIn(ctx)
  const tenantId = requireTenant(ctx)
  const phone = parsePhone(input.phone)
  const services = getIdentityServices()

  const changeId = await withTenant(ctx.db, tenantId, async (tx) => {
    const target = await loadTarget(tx, tenantId, input.membershipId)
    await refuseUnsafe(ctx, target)
    const access = await accessFor(ctx.db, target.userId)
    if (target.mfaEnabled || access.mfaRequired) {
      throw refuse(
        "This person signs in with a password and a second step, so a new number won't help them. Reset their second step instead."
      )
    }
    await refuseOverLimits(ctx, tx, tenantId, target.userId)
    const taken = await tx.execute(sql`
      select 1 from platform.users where phone_number = ${phone}
      union all select 1 from platform.user_backup_phones where phone_number = ${phone}
      limit 1`)
    if (taken.rows.length > 0) throw numberRefused()
    const result = await tx.execute(sql`
      insert into platform.contact_changes
        (tenant_id, user_id, changed_by, kind, check_method, evidence, reason, note,
         new_number_ending)
      values (${tenantId}, ${target.userId}, ${userIdOf(ctx)}, 'phone_number',
              ${input.checkMethod}, ${input.evidence}, ${input.reason}, ${input.note},
              ${numberEnding(phone)})
      returning id`)
    return String(result.rows[0]?.id)
  })

  const code = await issueCode(
    ctx.db,
    services.hashKey,
    `contact-change:${changeId}:${phone}`,
    ctx.now(),
    10 * 60
  )
  await sendCode(
    services,
    phone,
    `Your code from ${ctx.school?.name ?? "your school"} is ${code}. Give it only to the school staff helping you now.`
  )
  return { changeId }
}

/** Step 2: the person reads back the code; the number changes. */
export async function confirmNumberChange(
  ctx: RequestContext,
  input: z.output<typeof confirmNumberChangeInput>
): Promise<void> {
  authorize(ctx, "identity.contact.change")
  requireRecentSignIn(ctx)
  const tenantId = requireTenant(ctx)
  const phone = parsePhone(input.phone)
  const services = getIdentityServices()
  const ok = await useCode(
    ctx.db,
    services.hashKey,
    `contact-change:${input.changeId}:${phone}`,
    input.code,
    ctx.now()
  )
  if (!ok) {
    throw ValidationError.of(
      "code",
      "That code is not right or has expired. Please start again."
    )
  }

  const target = await withTenant(ctx.db, tenantId, async (tx) => {
    const change = await tx.execute(sql`
      select user_id, changed_by from platform.contact_changes
      where tenant_id = ${tenantId} and id = ${input.changeId}
        and kind = 'phone_number' and status = 'pending'
      for update`)
    const row = change.rows[0]
    if (row === undefined || String(row.changed_by) !== userIdOf(ctx)) {
      throw new NotFoundError()
    }
    const membership = await tx.execute(sql`
      select id from platform.memberships
      where tenant_id = ${tenantId} and user_id = ${String(row.user_id)}`)
    const target = await loadTarget(
      tx,
      tenantId,
      String(membership.rows[0]?.id)
    )
    await refuseUnsafe(ctx, target)
    await refuseOverLimits(ctx, tx, tenantId, target.userId)
    try {
      await tx.execute(sql`
        update platform.users
        set phone_number = ${phone}, phone_number_verified = true, updated_at = now()
        where id = ${target.userId}`)
    } catch (error) {
      if (isUniqueViolation(error)) throw numberRefused()
      throw error
    }
    await tx.execute(sql`
      update platform.contact_changes set status = 'done', completed_at = now()
      where tenant_id = ${tenantId} and id = ${input.changeId}`)
    await recordAudit(tx, ctx, {
      action: "identity.phone.changed_by_school",
      entityType: "user",
      entityId: target.userId,
      changes: { phone: { changed: true } },
    })
    await recordSecurityEvent(tx, {
      userId: target.userId,
      tenantId,
      kind: "phone_changed",
    })
    return target
  })

  await revokeSessions(ctx.db, target.userId)
  const date = time.formatDate(schoolToday(ctx))
  await sendNotice(services, ctx.log, {
    phones: [target.phone, target.backupPhone],
    emails: [target.email],
    subject: "Your Akoso sign-in number was changed",
    text: `Your Akoso sign-in number was changed by ${ctx.school?.name ?? "your school"} on ${date}. If this wasn't you, contact the school.`,
  })
}

/** Removes a staff member's lost second step; they set it up again (section 6). */
export async function resetMemberMfa(
  ctx: RequestContext,
  input: z.output<typeof resetMemberMfaInput>
): Promise<void> {
  authorize(ctx, "identity.mfa.reset")
  requireRecentSignIn(ctx)
  const tenantId = requireTenant(ctx)
  const target = await withTenant(ctx.db, tenantId, async (tx) => {
    const target = await loadTarget(tx, tenantId, input.membershipId)
    await refuseUnsafe(ctx, target)
    if (!target.mfaEnabled) {
      throw refuse("This person has no second step to reset.")
    }
    await tx.execute(sql`
      insert into platform.contact_changes
        (tenant_id, user_id, changed_by, kind, check_method, evidence, reason, note,
         status, completed_at)
      values (${tenantId}, ${target.userId}, ${userIdOf(ctx)}, 'mfa_reset',
              ${input.checkMethod}, ${input.evidence}, ${input.reason}, ${input.note},
              'done', now())`)
    await tx.execute(
      sql`delete from platform.two_factors where user_id = ${target.userId}`
    )
    await tx.execute(sql`
      update platform.users set two_factor_enabled = false, updated_at = now()
      where id = ${target.userId}`)
    await recordAudit(tx, ctx, {
      action: "identity.mfa.reset_by_school",
      entityType: "user",
      entityId: target.userId,
    })
    await recordSecurityEvent(tx, {
      userId: target.userId,
      tenantId,
      kind: "mfa_reset",
    })
    return target
  })
  await revokeSessions(ctx.db, target.userId)
  await sendNotice(getIdentityServices(), ctx.log, {
    phones: [target.phone],
    emails: [target.email],
    subject: "Your Akoso second sign-in step was reset",
    text: `${ctx.school?.name ?? "Your school"} reset the second sign-in step on your Akoso account. You'll set it up again next time you sign in. If this wasn't expected, contact the school.`,
  })
}
