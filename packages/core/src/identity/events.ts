// Sign-in and account-security events (brief section 6; spec section 8). Append-only.
// Never a code, token or password: only a kind and a short reason code.
import { sql, type Database } from "@akoso/db"

type SecurityEventKind =
  | "sign_in"
  | "sign_in_failed"
  | "code_sent"
  | "account_locked"
  | "mfa_enabled"
  | "mfa_disabled"
  | "password_changed"
  | "password_reset"
  | "sessions_revoked"

export interface SecurityEvent {
  userId: string | null
  kind: SecurityEventKind
  /** A fixed reason code such as "wrong_password"; never text from a request. */
  detail?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export async function recordSecurityEvent(
  db: Database,
  event: SecurityEvent
): Promise<void> {
  await db.execute(sql`
    insert into platform.security_events (user_id, kind, detail, ip_address, user_agent)
    values (${event.userId}, ${event.kind}, ${event.detail ?? null},
            ${event.ipAddress ?? null}, ${(event.userAgent ?? "").slice(0, 300) || null})`)
}
