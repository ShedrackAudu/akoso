// Better Auth for the Akoso team (spec: docs/specs/stage-1-sign-in-part-b.md, section 8).
// A second instance, entirely apart from schools': its own tables, its own cookie on
// the admin address, and passkeys only. No passwords, no codes by SMS.
//
// A passkey is registered either by someone already signed in, or with a short ticket
// from an enrolment link or a recovery code (tickets.ts), passed as the plugin's
// `context`. The ticket is checked when the options are made and used up when the
// passkey is verified; the person is then signed in.
import { randomUUID } from "node:crypto"

import { passkey } from "@better-auth/passkey"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"

import type { Database } from "@akoso/db"
import * as tables from "@akoso/db/schema/team"

import { recordTeamAudit } from "./audit"
import { recordTeamSecurityEvent } from "./events"
import { peekTicket, useTicket } from "./tickets"

export const TEAM_AUTH_BASE_PATH = "/api/auth"

const MINUTE = 60

/** A passkey added while signed in needs a sign-in this recent (section 8). */
export const TEAM_RECENT_SIGN_IN_MINUTES = 5

export interface TeamAuthOptions {
  db: Database
  /** BETTER_AUTH_SECRET. */
  secret: string
  /** APP_BASE_DOMAIN, e.g. akoso.ng (akoso.localhost locally). */
  baseDomain: string
  now?: () => Date
}

/** The admin app's own origins: the only ones allowed to call its sign-in endpoints. */
export function adminOrigins(baseDomain: string): string[] {
  if (!baseDomain.endsWith(".localhost")) return [`https://admin.${baseDomain}`]
  // Locally the admin app runs on localhost (passkeys need a stable host): 3001 for
  // development, 3201 for the end-to-end tests.
  return ["3001", "3201"].flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ])
}

/** The WebAuthn relying party: the admin address only, never the school app's. */
const adminRpId = (baseDomain: string): string =>
  baseDomain.endsWith(".localhost") ? "localhost" : `admin.${baseDomain}`

const clientIp = (headers: Headers | undefined): string | null =>
  headers?.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null

/** A refusal that says nothing about why: an old link, a used code, a removed member. */
const notValid = () =>
  new APIError("FORBIDDEN", {
    message: "This link or code doesn't work. Ask the Owner for a new one.",
  })

function teamAuthConfig(options: TeamAuthOptions) {
  const { db, secret, baseDomain } = options
  const now = options.now ?? (() => new Date())
  const local = baseDomain.endsWith(".localhost")
  const origins = adminOrigins(baseDomain)

  const config = {
    appName: "Akoso Admin",
    secret,
    baseURL: origins[0],
    basePath: TEAM_AUTH_BASE_PATH,
    trustedOrigins: origins,
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        teamUsers: tables.teamUsers,
        teamAccounts: tables.teamAccounts,
        teamSessions: tables.teamSessions,
        teamVerifications: tables.teamVerifications,
        teamPasskeys: tables.teamPasskeys,
      },
    }),
    user: { modelName: "teamUsers" },
    // Required by Better Auth; stays empty (no passwords, no outside sign-in).
    account: { modelName: "teamAccounts" },
    session: {
      modelName: "teamSessions",
      // At most 8 hours from sign-in and 30 minutes idle, checked on every request
      // (context.ts). Refreshed every 5 minutes of use, so idleness is visible.
      expiresIn: 8 * 60 * MINUTE,
      updateAge: 5 * MINUTE,
    },
    verification: { modelName: "teamVerifications" },
    emailAndPassword: { enabled: false },
    // Team members change nothing about themselves through Better Auth's own routes.
    // Passkeys are removed only through deleteMyPasskey(), which keeps at least one,
    // needs a recent sign-in and is audit-logged.
    disabledPaths: [
      "/update-user",
      "/change-email",
      "/delete-user",
      "/passkey/delete-passkey",
      "/passkey/update-passkey",
    ],
    rateLimit: { enabled: false },
    advanced: {
      // Its own name, so it never meets the school app's cookie, even on localhost.
      cookiePrefix: "akoso_team",
      useSecureCookies: !local,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      },
      database: { generateId: () => randomUUID() },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    plugins: [
      passkey({
        rpID: adminRpId(baseDomain),
        rpName: "Akoso Admin",
        origin: origins,
        // A passkey the device stores and unlocks with a fingerprint, face or PIN.
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        schema: { passkey: { modelName: "teamPasskeys" } },
        registration: {
          requireSession: false,
          resolveUser: async ({ context }) => {
            const ticket = await peekTicket(db, context ?? "", now())
            if (ticket === null) throw notValid()
            return {
              id: ticket.userId,
              name: ticket.email,
              displayName: ticket.name,
            }
          },
          afterVerification: async ({ ctx, user, context }) => {
            // No ticket: a signed-in person adding another passkey (the plugin has
            // already matched the session to this person).
            if (context === null || context === undefined || context === "") {
              await recordTeamSecurityEvent(db, {
                userId: user.id,
                kind: "passkey_added",
                ipAddress: clientIp(ctx.headers),
                userAgent: ctx.headers?.get("user-agent") ?? null,
              })
              await recordTeamAudit(db, {
                actorId: user.id,
                action: "team.passkey.added",
                entityType: "team_user",
                entityId: user.id,
              })
              return
            }
            // Without a session: the ticket must still be good, and is used up now.
            const ticket = await useTicket(db, context, now())
            if (ticket?.userId !== user.id) throw notValid()
            await recordTeamSecurityEvent(db, {
              userId: user.id,
              kind: ticket.purpose === "enrol" ? "enrolled" : "passkey_added",
              detail:
                ticket.purpose === "recovery" ? "after_recovery" : undefined,
              ipAddress: clientIp(ctx.headers),
              userAgent: ctx.headers?.get("user-agent") ?? null,
            })
            await recordTeamAudit(db, {
              actorId: user.id,
              action:
                ticket.purpose === "enrol"
                  ? "team.member.enrolled"
                  : "team.passkey.added",
              entityType: "team_user",
              entityId: user.id,
            })
            return { userId: user.id }
          },
        },
        authentication: {
          afterVerification: ({ verification }) => {
            // The device must have checked the person (fingerprint, face or PIN).
            if (!verification.authenticationInfo.userVerified) {
              throw new APIError("UNAUTHORIZED", {
                message:
                  "Your device didn't confirm it's you. Use a fingerprint, face or PIN.",
              })
            }
            return Promise.resolve()
          },
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Adding another passkey while signed in needs a recent sign-in.
        if (ctx.path !== "/passkey/generate-register-options") return
        const session = await ctx.context.internalAdapter
          .findSession(
            ctx.getCookie(ctx.context.authCookies.sessionToken.name) ?? ""
          )
          .catch(() => null)
        if (session === null) return
        const startedAt = new Date(session.session.createdAt).getTime()
        if (
          now().getTime() - startedAt >
          TEAM_RECENT_SIGN_IN_MINUTES * MINUTE * 1000
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Please sign in again with your passkey first.",
            code: "REAUTH_REQUIRED",
          })
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/passkey/verify-authentication") return
        const newSession = ctx.context.newSession
        if (newSession === null) return
        await recordTeamSecurityEvent(db, {
          userId: newSession.user.id,
          kind: "sign_in",
          ipAddress: clientIp(ctx.headers),
          userAgent: ctx.headers?.get("user-agent") ?? null,
        })
      }),
    },
  } satisfies BetterAuthOptions
  return config
}

export type TeamAuth = ReturnType<
  typeof betterAuth<ReturnType<typeof teamAuthConfig>>
>

/** Better Auth for the Akoso team: one per process (see instance.ts). */
export function createTeamAuth(options: TeamAuthOptions): TeamAuth {
  return betterAuth(teamAuthConfig(options))
}
