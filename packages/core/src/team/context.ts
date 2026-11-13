// Who is signed in to the admin app (section 8): a team session, never a school one,
// for a member whose access has not been removed, within 8 hours of signing in and 30
// minutes of last use.
import type { ActionKey } from "@akoso/schemas/api"
import {
  isTeamRoleKey,
  teamPermissionsFor,
  type TeamRoleKey,
} from "@akoso/schemas/permissions"

import { sql, type Database } from "@akoso/db"

import {
  ForbiddenError,
  ReauthRequiredError,
  type Logger,
} from "../kernel/index"
import { TEAM_RECENT_SIGN_IN_MINUTES } from "./auth"
import { getTeamAuth } from "./instance"

export interface TeamMember {
  userId: string
  name: string
  email: string
  roles: TeamRoleKey[]
  permissions: ReadonlySet<ActionKey>
  signedInAt: Date
}

export interface TeamContext {
  requestId: string
  db: Database
  now: () => Date
  log: Logger
  member: TeamMember
}

export interface TeamBase {
  requestId: string
  db: Database
  now: () => Date
  log: Logger
}

const MAX_SESSION_MS = 8 * 60 * 60 * 1000
// Better Auth refreshes the session every 5 minutes of use, so allow for that.
const IDLE_MS = (30 + 5) * 60 * 1000

/** The signed-in team member, or null (no session, or one past its limits, now ended). */
export async function resolveTeamSignedIn(
  headers: Headers,
  base: TeamBase
): Promise<TeamContext | null> {
  const auth = getTeamAuth()
  const found = await auth.api.getSession({ headers })
  if (found === null) return null
  const at = base.now().getTime()
  const startedAt = new Date(found.session.createdAt).getTime()
  const lastUsedAt = new Date(found.session.updatedAt).getTime()
  if (at - startedAt > MAX_SESSION_MS || at - lastUsedAt > IDLE_MS) {
    await auth.api.revokeSession({
      headers,
      body: { token: found.session.token },
    })
    return null
  }
  const user = await base.db.execute(sql`
    select u.name, u.email, u.removed_at,
           coalesce(array(select g.role from platform.team_role_grants g
                          where g.user_id = u.id order by g.role), '{}') as roles
    from platform.team_users u where u.id = ${found.user.id}`)
  const row = user.rows[0]
  if (row === undefined || row.removed_at !== null) return null
  const roles = (row.roles as string[]).filter(isTeamRoleKey)
  return {
    ...base,
    member: {
      userId: found.user.id,
      name: String(row.name),
      email: String(row.email),
      roles,
      permissions: teamPermissionsFor(roles),
      signedInAt: new Date(found.session.createdAt),
    },
  }
}

/** Refuses unless the member holds the permission. */
export function authorizeTeam(ctx: TeamContext, action: ActionKey): void {
  if (!ctx.member.permissions.has(action)) throw new ForbiddenError()
}

/** Refuses unless this session signed in with a passkey in the last few minutes. */
export function requireRecentTeamSignIn(ctx: TeamContext): void {
  const age = ctx.now().getTime() - ctx.member.signedInAt.getTime()
  if (age > TEAM_RECENT_SIGN_IN_MINUTES * 60 * 1000) {
    throw new ReauthRequiredError()
  }
}
