// Sign-in and account-security events (brief section 6; spec section 8). Append-only.
// Never a code, token or password: only a kind and a short reason code.
import { sql, type Database } from "@akoso/db"

export const SECURITY_EVENT_KINDS = [
  "sign_in",
  "sign_in_failed",
  "code_sent",
  "account_locked",
  "mfa_enabled",
  "mfa_disabled",
  "password_changed",
  "password_reset",
  "sessions_revoked",
  // Part B.
  "roles_changed",
  "membership_suspended",
  "membership_reactivated",
  "membership_ended",
  "phone_changed",
  "backup_phone_added",
  "backup_phone_removed",
  "mfa_reset",
  "email_changed",
  "profile_changed",
  "account_deleted",
] as const
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number]

export interface SecurityEvent {
  userId: string | null
  kind: SecurityEventKind
  /** The school that caused it (a number change, a suspension); null for the account. */
  tenantId?: string | null
  /** A fixed reason code such as "wrong_password"; never text from a request. */
  detail?: string
  ipAddress?: string | null
  userAgent?: string | null
}

/** Anything that can run a statement: the pool, or a transaction. */
type Executor = Pick<Database, "execute">

export async function recordSecurityEvent(
  db: Executor,
  event: SecurityEvent
): Promise<void> {
  await db.execute(sql`
    insert into platform.security_events
      (user_id, caused_by_school_id, kind, detail, ip_address, user_agent)
    values (${event.userId}, ${event.tenantId ?? null}, ${event.kind},
            ${event.detail ?? null}, ${event.ipAddress ?? null},
            ${(event.userAgent ?? "").slice(0, 300) || null})`)
}
