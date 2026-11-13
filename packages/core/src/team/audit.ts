// The team audit log (section 8): every Akoso team action, in one hash chain. The
// database trigger sets the sequence number, the time and the hashes.
import { sql, type Database } from "@akoso/db"

type Executor = Pick<Database, "execute">

export interface TeamAuditEvent {
  /** The team member who acted, or null for the command line. */
  actorId: string | null
  action: `team.${string}`
  entityType: string
  entityId: string
  changes?: Record<string, unknown>
  requestId?: string
}

export async function recordTeamAudit(
  db: Executor,
  event: TeamAuditEvent
): Promise<void> {
  await db.execute(sql`
    insert into platform.team_audit_events
      (actor, action, entity_type, entity_id, changes, request_id)
    values (${event.actorId === null ? "system:cli" : `team:${event.actorId}`},
            ${event.action}, ${event.entityType}, ${event.entityId},
            ${JSON.stringify(event.changes ?? {})}::jsonb, ${event.requestId ?? null})`)
}

export type TeamChainCheck =
  { ok: true } | { ok: false; brokenSeq: number; reason: string }

/** Recomputes the whole team chain in the database. */
export async function verifyTeamAuditChain(
  db: Database
): Promise<TeamChainCheck> {
  const result = await db.execute(
    sql`select * from platform.verify_team_audit_chain()`
  )
  const row = result.rows[0]
  if (row === undefined) return { ok: true }
  return {
    ok: false,
    brokenSeq: Number(row.broken_seq),
    reason: String(row.reason),
  }
}
