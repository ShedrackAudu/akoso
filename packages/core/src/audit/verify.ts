// Checking a school's audit chain (spec section 2). The database recomputes it; this
// returns the first broken record, or ok. The worker runs it daily once pg-boss exists.
import { sql, type Database } from "@akoso/db"

export type ChainCheck =
  { ok: true } | { ok: false; brokenSeq: number; reason: string }

export async function verifyAuditChain(
  db: Database,
  tenantId: string
): Promise<ChainCheck> {
  const result = await db.execute(
    sql`select broken_seq, reason from platform.verify_audit_chain(${tenantId})`
  )
  const row = result.rows[0]
  if (row === undefined) return { ok: true }
  return {
    ok: false,
    brokenSeq: Number(row.broken_seq),
    reason: String(row.reason),
  }
}
