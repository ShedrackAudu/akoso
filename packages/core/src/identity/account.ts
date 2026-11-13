// My account (spec: stage-1-sign-in-part-b.md, sections 4 and 7): name, email, phone
// number, backup number, and deleting the account. Platform-level: no school.
import type { z } from "zod"

import { sql, withTenant, type Database } from "@akoso/db"
import type {
  confirmBackupPhoneInput,
  confirmEmailChangeInput,
  confirmPhoneChangeInput,
  requestEmailChangeInput,
  requestPhoneCodeInput,
  updateNameInput,
} from "@akoso/schemas/identity"
import { isStaffRole } from "@akoso/schemas/permissions"

import { recordAudit } from "../audit/index"
import {
  authorize,
  consumeLimits,
  ForbiddenError,
  getSetting,
  NotFoundError,
  ValidationError,
  type PublicContext,
  type RequestContext,
} from "../kernel/index"
import { accessFor } from "./access"
import { recordSecurityEvent } from "./events"
import {
  isRealEmail,
  isUniqueViolation,
  requireRecentSignIn,
  revokeSessions,
  textOrNull,
  userIdOf,
} from "./guards"
import { getIdentityServices } from "./instance"
import { sendCode, sendNotice } from "./notices"
import { issueCode, issueLinkToken, useCode, useLinkToken } from "./one-time"
import { normalisePhone } from "./phone"

export interface MyAccount {
  name: string
  /** Null for phone-only people (who have a placeholder address). */
  email: string | null
  phone: string | null
  backupPhone: string | null
  /** Works for a school somewhere: may add an email. */
  isStaff: boolean
}

interface AccountRow {
  name: string
  email: string
  phone: string | null
  backupPhone: string | null
}

async function loadAccount(db: Database, userId: string): Promise<AccountRow> {
  const result = await db.execute(sql`
    select u.name, u.email, u.phone_number, b.phone_number as backup_phone
    from platform.users u
    left join platform.user_backup_phones b on b.user_id = u.id
    where u.id = ${userId} and u.deleted_at is null`)
  const row = result.rows[0]
  if (row === undefined) throw new NotFoundError()
  return {
    name: String(row.name),
    email: String(row.email),
    phone: textOrNull(row.phone_number),
    backupPhone: textOrNull(row.backup_phone),
  }
}

export async function getMyAccount(ctx: RequestContext): Promise<MyAccount> {
  authorize(ctx, "identity.profile.read")
  const userId = userIdOf(ctx)
  const account = await loadAccount(ctx.db, userId)
  const access = await accessFor(ctx.db, userId)
  return {
    name: account.name,
    email: isRealEmail(account.email) ? account.email : null,
    phone: account.phone,
    backupPhone: account.backupPhone,
    isStaff: access.schools.some(
      (school) => school.hasCustomRole || school.roles.some(isStaffRole)
    ),
  }
}

export async function updateMyName(
  ctx: RequestContext,
  input: z.output<typeof updateNameInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  await ctx.db.execute(sql`
    update platform.users set name = ${input.name}, updated_at = now()
    where id = ${userId} and deleted_at is null`)
  await recordSecurityEvent(ctx.db, { userId, kind: "profile_changed" })
}

/** The same refusal for a bad number and one that is taken, so nothing leaks. */
const numberRefused = () =>
  ValidationError.of("phone", "This number can't be used. Please try another.")

function parsePhone(typed: string): string {
  const phone = normalisePhone(typed)
  if (phone === null) {
    throw ValidationError.of("phone", "Enter a valid phone number")
  }
  return phone
}

/** Whether a number is anyone's main or backup number already. */
async function numberInUse(db: Database, phone: string): Promise<boolean> {
  const result = await db.execute(sql`
    select 1 from platform.users where phone_number = ${phone}
    union all
    select 1 from platform.user_backup_phones where phone_number = ${phone}
    limit 1`)
  return result.rows.length > 0
}

/** The sign-in limits on codes to one number, shared with sign-in (spec 7). */
async function limitCodesTo(ctx: RequestContext, phone: string): Promise<void> {
  const limits = await getSetting(ctx.db, "limits.sign_in")
  await consumeLimits(
    ctx.db,
    [
      {
        key: `code:phone:${phone}`,
        limit: limits.codesPerNumberPer15Minutes,
        windowSeconds: 15 * 60,
      },
      {
        key: `code:phone:${phone}`,
        limit: limits.codesPerNumberPerDay,
        windowSeconds: 24 * 60 * 60,
      },
    ],
    () => ctx.now()
  )
}

// Backup number (section 4).

export async function requestBackupPhone(
  ctx: RequestContext,
  input: z.output<typeof requestPhoneCodeInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const phone = parsePhone(input.phone)
  if (await numberInUse(ctx.db, phone)) throw numberRefused()
  await limitCodesTo(ctx, phone)
  const services = getIdentityServices()
  const code = await issueCode(
    ctx.db,
    services.hashKey,
    `backup-phone:${userId}:${phone}`,
    ctx.now()
  )
  await sendCode(
    services,
    phone,
    `Your Akoso code to add this number is ${code}. It expires in 5 minutes. Never share it with anyone.`
  )
}

export async function confirmBackupPhone(
  ctx: RequestContext,
  input: z.output<typeof confirmBackupPhoneInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const phone = parsePhone(input.phone)
  const services = getIdentityServices()
  const ok = await useCode(
    ctx.db,
    services.hashKey,
    `backup-phone:${userId}:${phone}`,
    input.code,
    ctx.now()
  )
  if (!ok) {
    throw ValidationError.of(
      "code",
      "That code is not right or has expired. Please request a new one."
    )
  }
  const account = await loadAccount(ctx.db, userId)
  try {
    await ctx.db.transaction(async (tx) => {
      await tx.execute(
        sql`delete from platform.user_backup_phones where user_id = ${userId}`
      )
      await tx.execute(sql`
        insert into platform.user_backup_phones (user_id, phone_number, verified_at)
        values (${userId}, ${phone}, ${ctx.now().toISOString()})`)
      await recordSecurityEvent(tx, { userId, kind: "backup_phone_added" })
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw numberRefused()
    throw error
  }
  await sendNotice(services, ctx.log, {
    phones: [account.phone],
    emails: [account.email],
    subject: "A backup number was added to your Akoso account",
    text: "A backup number was added to your Akoso account. If this wasn't you, contact your school.",
  })
}

export async function removeBackupPhone(ctx: RequestContext): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const result = await ctx.db.execute(sql`
    delete from platform.user_backup_phones where user_id = ${userId} returning user_id`)
  if (result.rows.length > 0) {
    await recordSecurityEvent(ctx.db, { userId, kind: "backup_phone_removed" })
  }
}

// Changing my own number while I still have the old one (section 4).

export async function requestPhoneChange(
  ctx: RequestContext,
  input: z.output<typeof requestPhoneCodeInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const account = await loadAccount(ctx.db, userId)
  if (account.phone === null) {
    throw ValidationError.of("phone", "Your account has no number to change")
  }
  const phone = parsePhone(input.phone)
  if (await numberInUse(ctx.db, phone)) throw numberRefused()
  await limitCodesTo(ctx, phone)
  await limitCodesTo(ctx, account.phone)
  const services = getIdentityServices()
  const newCode = await issueCode(
    ctx.db,
    services.hashKey,
    `phone-change-new:${userId}:${phone}`,
    ctx.now()
  )
  const oldCode = await issueCode(
    ctx.db,
    services.hashKey,
    `phone-change-old:${userId}`,
    ctx.now()
  )
  await sendCode(
    services,
    phone,
    `Your Akoso code for your new number is ${newCode}. It expires in 5 minutes. Never share it with anyone.`
  )
  await sendCode(
    services,
    account.phone,
    `Your Akoso code to move your sign-in to a new number is ${oldCode}. It expires in 5 minutes. If this wasn't you, ignore it and contact your school.`
  )
}

export async function confirmPhoneChange(
  ctx: RequestContext,
  input: z.output<typeof confirmPhoneChangeInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const phone = parsePhone(input.phone)
  const services = getIdentityServices()
  const newOk = await useCode(
    ctx.db,
    services.hashKey,
    `phone-change-new:${userId}:${phone}`,
    input.newCode,
    ctx.now()
  )
  const oldOk = await useCode(
    ctx.db,
    services.hashKey,
    `phone-change-old:${userId}`,
    input.oldCode,
    ctx.now()
  )
  if (!newOk || !oldOk) {
    throw ValidationError.of(
      "",
      "One of the codes is not right or has expired. Please start again."
    )
  }
  const account = await loadAccount(ctx.db, userId)
  try {
    await ctx.db.transaction(async (tx) => {
      await tx.execute(sql`
        update platform.users
        set phone_number = ${phone}, phone_number_verified = true, updated_at = now()
        where id = ${userId}`)
      await recordSecurityEvent(tx, { userId, kind: "phone_changed" })
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw numberRefused()
    throw error
  }
  await revokeSessions(ctx.db, userId)
  await sendNotice(services, ctx.log, {
    phones: [account.phone, account.backupPhone],
    emails: [account.email],
    subject: "Your Akoso sign-in number was changed",
    text: "Your Akoso sign-in number was changed. If this wasn't you, contact your school.",
  })
}

// Email, for people who work for a school (section 4).

export async function requestEmailChange(
  ctx: RequestContext,
  input: z.output<typeof requestEmailChangeInput>
): Promise<void> {
  authorize(ctx, "identity.profile.update")
  const userId = userIdOf(ctx)
  const me = await getMyAccount(ctx)
  if (!me.isStaff) throw new ForbiddenError()
  if (input.email.endsWith(".invalid")) {
    throw ValidationError.of("email", "Enter an email address")
  }
  const taken = await ctx.db.execute(
    sql`select 1 from platform.users where email = ${input.email} limit 1`
  )
  if (taken.rows.length > 0) {
    throw ValidationError.of(
      "email",
      "This email can't be used. Please try another."
    )
  }
  await consumeLimits(
    ctx.db,
    [{ key: `email-change:${userId}`, limit: 5, windowSeconds: 24 * 60 * 60 }],
    () => ctx.now()
  )
  const services = getIdentityServices()
  const token = await issueLinkToken(
    ctx.db,
    services.hashKey,
    `email-change:${userId}`,
    input.email,
    ctx.now()
  )
  const link = linkTo(
    services.baseDomain,
    `/account/email/confirm?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  )
  await services.email.send({
    to: input.email,
    subject: "Confirm your email for Akoso",
    text: `Open this link to use this email for Akoso: ${link}\n\nIt works once, for 24 hours. If you didn't ask for this, ignore this email.`,
    purpose: "account_link",
  })
  await sendNotice(services, ctx.log, {
    phones: [],
    emails: [me.email],
    subject: "Someone asked to change your Akoso email",
    text: "Someone asked to change the email on your Akoso account. If this wasn't you, sign in and change your password, or contact your school.",
  })
}

/** The app's address for a link in a message. */
function linkTo(baseDomain: string, path: string): string {
  return baseDomain.endsWith(".localhost")
    ? `http://app.${baseDomain}:3000${path}`
    : `https://app.${baseDomain}${path}`
}

/** Opening the link: needs no sign-in, since the token is the proof. */
export async function confirmEmailChange(
  ctx: PublicContext,
  input: z.output<typeof confirmEmailChangeInput>
): Promise<boolean> {
  const services = getIdentityServices()
  const email = await useLinkToken(
    ctx.db,
    services.hashKey,
    `email-change:${input.userId}`,
    input.token,
    ctx.now()
  )
  if (email === null) return false
  const account = await loadAccount(ctx.db, input.userId)
  try {
    await ctx.db.transaction(async (tx) => {
      await tx.execute(sql`
        update platform.users set email = ${email}, email_verified = true, updated_at = now()
        where id = ${input.userId} and deleted_at is null`)
      await recordSecurityEvent(tx, {
        userId: input.userId,
        kind: "email_changed",
      })
    })
  } catch (error) {
    if (isUniqueViolation(error)) return false
    throw error
  }
  await sendNotice(services, ctx.log, {
    phones: [account.phone],
    emails: [account.email],
    subject: "Your Akoso email was changed",
    text: "The email on your Akoso account was changed. If this wasn't you, contact your school.",
  })
  return true
}

// Deleting my account (section 7).

export async function deleteMyAccount(ctx: RequestContext): Promise<void> {
  authorize(ctx, "identity.profile.update")
  requireRecentSignIn(ctx)
  const userId = userIdOf(ctx)
  const access = await accessFor(ctx.db, userId)

  // The last active proprietor of a school must hand over first.
  for (const membership of access.schools) {
    if (!membership.roles.includes("proprietor")) continue
    const others = await withTenant(
      ctx.db,
      membership.school.id,
      async (tx) => {
        const result = await tx.execute(sql`
        select count(*)::int as n from platform.memberships
        where tenant_id = ${membership.school.id} and user_id <> ${userId}
          and status = 'active' and 'proprietor' = any(roles)`)
        return Number(result.rows[0]?.n ?? 0)
      }
    )
    if (others === 0) {
      throw ValidationError.of(
        "",
        `You're the only proprietor of ${membership.school.name}. Make someone else proprietor before deleting your account.`
      )
    }
  }

  const ended = await ctx.db.transaction(async (tx) => {
    for (const table of [
      "sessions",
      "two_factors",
      "user_credentials",
      "user_backup_phones",
    ] as const) {
      await tx.execute(
        sql`delete from ${sql.raw(`platform.${table}`)} where user_id = ${userId}`
      )
    }
    await tx.execute(sql`
      delete from platform.verifications where identifier like ${`%${userId}%`}`)
    await tx.execute(sql`
      update platform.users
      set name = 'Deleted account', email = ${`deleted-${userId}@deleted.invalid`},
          email_verified = false, phone_number = null, phone_number_verified = false,
          two_factor_enabled = false, image = null, deleted_at = now(), updated_at = now()
      where id = ${userId}`)
    await recordSecurityEvent(tx, { userId, kind: "account_deleted" })
    const result = await tx.execute(
      sql`select * from platform.end_memberships_of_deleted_user(${userId})`
    )
    return result.rows.map((row) => ({
      tenantId: String(row.tenant_id),
      membershipId: String(row.membership_id),
    }))
  })

  // Each school's audit log records that the membership ended.
  for (const membership of ended) {
    const schoolCtx: RequestContext = { ...ctx, tenantId: membership.tenantId }
    await withTenant(ctx.db, membership.tenantId, async (tx) => {
      await recordAudit(tx, schoolCtx, {
        action: "membership.ended",
        entityType: "membership",
        entityId: membership.membershipId,
        changes: { status: { before: "active", after: "ended" } },
      })
      await recordSecurityEvent(tx, {
        userId,
        tenantId: membership.tenantId,
        kind: "membership_ended",
        detail: "account_deleted",
      })
    })
  }
}
