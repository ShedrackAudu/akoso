// Better Auth, set up for Akoso (brief section 6; spec docs/specs/stage-1-sign-in.md).
// One instance per process. It runs under the app role, on the platform's sign-in
// tables; it never touches school data.
import { randomUUID } from "node:crypto"

import { betterAuth, type BetterAuthOptions } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { bearer, phoneNumber, twoFactor } from "better-auth/plugins"

import { sql, type Database } from "@akoso/db"
import * as tables from "@akoso/db/schema/identity"
import type { sms } from "@akoso/providers"

import { consumeLimits, getSetting, type LimitCheck } from "../kernel/index"
import { accessFor } from "./access"
import { checkStoredCode, protectStoredCode } from "./codes"
import { recordSecurityEvent } from "./events"
import { issueCode, useCode } from "./one-time"
import { isCommonPassword } from "./passwords"
import { isNigerianNumber, normalisePhone } from "./phone"

const MINUTE = 60
const CODE_LIFETIME_SECONDS = 5 * MINUTE

/** Where Better Auth's endpoints live on app.{domain}. */
export const AUTH_BASE_PATH = "/api/auth"

export interface AuthOptions {
  db: Database
  /** BETTER_AUTH_SECRET. */
  secret: string
  /** APP_BASE_DOMAIN, e.g. akoso.ng (akoso.localhost locally). */
  baseDomain: string
  sms: sms.SmsProvider
  now?: () => Date
}

/** The app's own origins: the only ones allowed to call the sign-in endpoints. */
function appOrigins(baseDomain: string): string[] {
  if (!baseDomain.endsWith(".localhost")) return [`https://app.${baseDomain}`]
  const hosts = [`app.${baseDomain}`, "localhost", "127.0.0.1"]
  const ports = ["3000", "3200"]
  return hosts.flatMap((host) => ports.map((port) => `http://${host}:${port}`))
}

/** A request-body value as text, or "" when it is not text. */
const text = (value: unknown): string =>
  typeof value === "string" ? value : ""

const clientIp = (headers: Headers | undefined): string | null =>
  headers?.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null

/** A refusal Better Auth turns into a 429, with a plain message. */
const tooMany = () =>
  new APIError("TOO_MANY_REQUESTS", {
    message: "Too many attempts in a short time. Please wait and try again.",
  })

/** The same answer for a bad number, an unknown number and a wrong code. */
const badCode = () =>
  new APIError("BAD_REQUEST", {
    message: "That code is not right or has expired. Please request a new one.",
  })

function authConfig(options: AuthOptions) {
  const { db, secret, baseDomain } = options
  const now = options.now ?? (() => new Date())
  const local = baseDomain.endsWith(".localhost")
  const limit = (checks: LimitCheck[]) =>
    consumeLimits(db, checks, now).catch((error: unknown) => {
      if (error instanceof Error && error.name === "RateLimitedError") {
        throw tooMany()
      }
      throw error
    })

  /**
   * The person who owns a phone number (their main or backup number), if they may sign
   * in with a code.
   */
  async function codeSignInUser(phone: string): Promise<string | null> {
    const result = await db.execute(sql`
      select id, two_factor_enabled from platform.users
      where phone_number = ${phone} and deleted_at is null
      union all
      select u.id, u.two_factor_enabled from platform.user_backup_phones b
      join platform.users u on u.id = b.user_id
      where b.phone_number = ${phone} and u.deleted_at is null`)
    const user = result.rows[0]
    if (user === undefined) return null
    // Anyone with a second step (or whose role needs one) signs in with a password and
    // that step. A code by SMS would skip it (spec section 3).
    if (user.two_factor_enabled === true) return null
    const access = await accessFor(db, String(user.id))
    return access.mfaRequired ? null : String(user.id)
  }

  const config = {
    appName: "Akoso",
    secret,
    baseURL: appOrigins(baseDomain)[0],
    basePath: AUTH_BASE_PATH,
    trustedOrigins: appOrigins(baseDomain),
    // Never report anything about Akoso to Better Auth's makers.
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users: tables.users,
        userCredentials: tables.userCredentials,
        sessions: tables.sessions,
        verifications: tables.verifications,
        twoFactors: tables.twoFactors,
      },
    }),
    user: { modelName: "users" },
    account: { modelName: "userCredentials" },
    session: {
      modelName: "sessions",
      // Parents' sessions: 30 days, renewed while in use. Staff limits are enforced
      // on every request from their roles (see context.ts).
      expiresIn: 30 * 24 * 60 * MINUTE,
      updateAge: 15 * MINUTE,
    },
    verification: { modelName: "verifications" },
    emailAndPassword: {
      enabled: true,
      // Schools create accounts; nobody signs themselves up (spec section 1).
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    // Our own limits run in the hooks below, on the shared Postgres counters.
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: "akoso",
      // Secure (and so __Secure-prefixed) everywhere but local development. No Domain
      // attribute, so the cookie stays on app.{domain}.
      useSecureCookies: !local,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      database: { generateId: () => randomUUID() },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    databaseHooks: {
      verification: {
        create: {
          // Phone codes are saved only as keyed hashes.
          before: (verification) =>
            Promise.resolve({
              data: {
                ...verification,
                value: protectStoredCode(
                  secret,
                  verification.identifier,
                  verification.value
                ),
              },
            }),
        },
      },
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: CODE_LIFETIME_SECONDS,
        allowedAttempts: 3,
        phoneNumberValidator: (value) => normalisePhone(value) === value,
        sendOTP: async ({ phoneNumber: phone, code }, ctx) => {
          const userId = await codeSignInUser(phone)
          // No account (or one that must use a password): send nothing, answer the
          // same (spec section 2). The send runs in the background so both answers
          // take about as long.
          if (userId === null) return
          void options.sms
            .send({
              to: phone,
              body: `Your sign-in code is ${code}. It expires in 5 minutes. Never share it with anyone.`,
              purpose: "sign_in_code",
            })
            .then(() =>
              recordSecurityEvent(db, {
                userId,
                kind: "code_sent",
                ipAddress: clientIp(ctx?.headers),
              })
            )
            .catch(() => undefined)
        },
        sendPasswordResetOTP: async ({ phoneNumber: phone, code }) => {
          const result = await db.execute(
            sql`select id from platform.users where phone_number = ${phone}`
          )
          if (result.rows.length === 0) return
          void options.sms
            .send({
              to: phone,
              body: `Your password reset code is ${code}. It expires in 5 minutes. Never share it with anyone.`,
              purpose: "sign_in_code",
            })
            .catch(() => undefined)
        },
        verifyOTP: ({ phoneNumber: phone, code }, ctx) => {
          const identifier =
            ctx?.path === "/phone-number/reset-password"
              ? `${phone}-request-password-reset`
              : phone
          return checkStoredCode(db, secret, identifier, code, now())
        },
      }),
      twoFactor({
        issuer: "Akoso",
        schema: { twoFactor: { modelName: "twoFactors" } },
        backupCodeOptions: { amount: 10, storeBackupCodes: "encrypted" },
      }),
      // The mobile app (Stage 7) sends a bearer token instead of a cookie.
      bearer(),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const ip = clientIp(ctx.headers) ?? "unknown"
        // Limits are platform settings (limits.sign_in; closes T16).
        const limits = await getSetting(db, "limits.sign_in")
        const body = (ctx.body ?? {}) as Record<string, unknown>

        // Phone numbers arrive in any form; Better Auth sees only E.164.
        let phone: string | null = null
        if (typeof body.phoneNumber === "string") {
          phone = normalisePhone(body.phoneNumber)
        }

        switch (ctx.path) {
          case "/phone-number/send-otp":
          case "/phone-number/request-password-reset": {
            if (phone === null) throw badCode()
            await limit([
              {
                key: `code:phone:${phone}`,
                limit: limits.codesPerNumberPer15Minutes,
                windowSeconds: 15 * MINUTE,
              },
              {
                key: `code:phone:${phone}`,
                limit: limits.codesPerNumberPerDay,
                windowSeconds: 24 * 60 * MINUTE,
              },
              {
                key: `code:ip:${ip}`,
                limit: limits.codesPerIpPerHour,
                windowSeconds: 60 * MINUTE,
              },
              ...(isNigerianNumber(phone)
                ? []
                : [
                    {
                      key: `code:abroad:${phone}`,
                      limit: limits.codesPerNumberAbroadPer15Minutes,
                      windowSeconds: 15 * MINUTE,
                    },
                  ]),
            ])
            return { context: { body: { ...body, phoneNumber: phone } } }
          }
          case "/phone-number/verify": {
            if (phone === null) throw badCode()
            const userId = await codeSignInUser(phone)
            if (userId === null) throw badCode()
            // A backup number (part B, section 4): check its code here, then sign in
            // as the account's main number with a fresh internal code that never
            // leaves the server.
            const main = await db.execute(sql`
              select phone_number from platform.users where id = ${userId}`)
            const mainPhone = text(main.rows[0]?.phone_number)
            if (mainPhone !== "" && mainPhone !== phone) {
              const ok = await useCode(
                db,
                secret,
                phone,
                text(body.code),
                now()
              )
              if (!ok) throw badCode()
              const internal = await issueCode(db, secret, mainPhone, now())
              return {
                context: {
                  body: { ...body, phoneNumber: mainPhone, code: internal },
                },
              }
            }
            return { context: { body: { ...body, phoneNumber: phone } } }
          }
          case "/sign-in/email":
          case "/sign-in/phone-number": {
            const account =
              ctx.path === "/sign-in/email"
                ? text(body.email).trim().toLowerCase()
                : (phone ?? text(body.phoneNumber))
            try {
              await limit([
                {
                  key: `password:account:${account}`,
                  limit: limits.passwordAttemptsPerAccountPer15Minutes,
                  windowSeconds: 15 * MINUTE,
                },
                {
                  key: `password:ip:${ip}`,
                  limit: limits.passwordAttemptsPerIpPer15Minutes,
                  windowSeconds: 15 * MINUTE,
                },
              ])
            } catch (error) {
              // Locked: recorded for the account's owner, if there is one (spec 7).
              const owner = await db.execute(sql`
                select id from platform.users
                where email = ${account} or phone_number = ${account} limit 1`)
              const ownerId = text(owner.rows[0]?.id)
              if (ownerId !== "") {
                await recordSecurityEvent(db, {
                  userId: ownerId,
                  kind: "account_locked",
                  ipAddress: clientIp(ctx.headers),
                  userAgent: ctx.headers?.get("user-agent") ?? null,
                })
              }
              throw error
            }
            if (ctx.path === "/sign-in/phone-number") {
              if (phone === null) {
                throw new APIError("UNAUTHORIZED", {
                  message:
                    "That sign-in did not work. Check your details and try again.",
                })
              }
              return { context: { body: { ...body, phoneNumber: phone } } }
            }
            return { context: { body: { ...body, email: account } } }
          }
          case "/change-password":
          case "/reset-password":
          case "/phone-number/reset-password": {
            const candidate = text(body.newPassword)
            if (isCommonPassword(candidate)) {
              throw new APIError("BAD_REQUEST", {
                message: "That password is too common. Please choose another.",
              })
            }
            if (ctx.path === "/phone-number/reset-password" && phone !== null) {
              return { context: { body: { ...body, phoneNumber: phone } } }
            }
            return
          }
          default:
            return
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const ip = clientIp(ctx.headers)
        const userAgent = ctx.headers?.get("user-agent") ?? null
        const newSession = ctx.context.newSession
        switch (ctx.path) {
          case "/sign-in/email":
          case "/sign-in/phone-number":
          case "/phone-number/verify":
          case "/two-factor/verify-totp":
          case "/two-factor/verify-backup-code": {
            if (newSession !== null) {
              await recordSecurityEvent(db, {
                userId: newSession.user.id,
                kind: "sign_in",
                detail: ctx.path.replaceAll("/", "_").slice(1),
                ipAddress: ip,
                userAgent,
              })
            }
            return
          }
          case "/two-factor/enable":
          case "/two-factor/disable": {
            const session = ctx.context.session
            if (session === null) return
            // A change to the second step signs the person out everywhere else.
            const others = await ctx.context.internalAdapter.listSessions(
              session.user.id
            )
            for (const other of others) {
              if (other.token !== session.session.token) {
                await ctx.context.internalAdapter.deleteSession(other.token)
              }
            }
            await recordSecurityEvent(db, {
              userId: session.user.id,
              kind:
                ctx.path === "/two-factor/enable"
                  ? "mfa_enabled"
                  : "mfa_disabled",
              ipAddress: ip,
              userAgent,
            })
            return
          }
          case "/change-password": {
            const session = ctx.context.session
            if (session === null) return
            await recordSecurityEvent(db, {
              userId: session.user.id,
              kind: "password_changed",
              ipAddress: ip,
              userAgent,
            })
            return
          }
          default:
            return
        }
      }),
    },
  } satisfies BetterAuthOptions
  return config
}

export type AkosoAuth = ReturnType<
  typeof betterAuth<ReturnType<typeof authConfig>>
>

/** Better Auth for Akoso: one per process (see instance.ts). */
export function createAuth(options: AuthOptions): AkosoAuth {
  return betterAuth(authConfig(options))
}
