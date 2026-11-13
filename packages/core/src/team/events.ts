// Sign-in and account-security events for team members (section 8). Append-only.
// Never a token, ticket or recovery code.
import { sql, type Database } from "@akoso/db"

export const TEAM_SECURITY_EVENT_KINDS = [
  "sign_in",
  "enrolled",
  "passkey_added",
  "passkey_removed",
  "recovery_code_used",
  "recovery_codes_created",
  "roles_changed",
  "access_removed",
  "sessions_revoked",
] as const
export type TeamSecurityEventKind = (typeof TEAM_SECURITY_EVENT_KINDS)[number]

type Executor = Pick<Database, "execute">

export async function recordTeamSecurityEvent(
  db: Executor,
  event: {
    userId: string | null
    kind: TeamSecurityEventKind
    detail?: string | undefined
    ipAddress?: string | null
    userAgent?: string | null
  }
): Promise<void> {
  await db.execute(sql`
    insert into platform.team_security_events (user_id, kind, detail, ip_address, user_agent)
    values (${event.userId}, ${event.kind}, ${event.detail ?? null},
            ${event.ipAddress ?? null}, ${(event.userAgent ?? "").slice(0, 300) || null})`)
}
