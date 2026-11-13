// One-time codes and link tokens for part B's own flows (adding a backup number,
// changing a number, confirming an email). Stored like sign-in codes: only a keyed hash,
// in platform.verifications, with an expiry and an attempt count (brief 6, 28). Never
// logged. Checking reuses the sign-in code checker.
import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto"

import { sql, type Database } from "@akoso/db"

import { checkStoredCode } from "./codes"

type Executor = Pick<Database, "execute">

const keyedHash = (hashKey: string, identifier: string, code: string): string =>
  createHmac("sha256", hashKey).update(`${identifier}\n${code}`).digest("hex")

/**
 * A new 6-digit code for `identifier`, replacing any earlier one. Returns the code to
 * send; only its keyed hash is stored.
 */
export async function issueCode(
  db: Executor,
  hashKey: string,
  identifier: string,
  now: Date,
  lifetimeSeconds = 5 * 60
): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")
  await db.execute(
    sql`delete from platform.verifications where identifier = ${identifier}`
  )
  await db.execute(sql`
    insert into platform.verifications (id, identifier, value, expires_at, created_at, updated_at)
    values (${randomUUID()}, ${identifier}, ${`${keyedHash(hashKey, identifier, code)}:0`},
            ${new Date(now.getTime() + lifetimeSeconds * 1000).toISOString()}, now(), now())`)
  return code
}

/** Checks a typed code (3 attempts, then it is gone). A right code is used up. */
export async function useCode(
  db: Database,
  hashKey: string,
  identifier: string,
  code: string,
  now: Date
): Promise<boolean> {
  if (!/^\d{6}$/.test(code.trim())) return false
  const ok = await checkStoredCode(db, hashKey, identifier, code, now)
  if (ok) {
    await db.execute(
      sql`delete from platform.verifications where identifier = ${identifier}`
    )
  }
  return ok
}

/**
 * A new link token for `identifier` (an email confirmation), valid for a day. The
 * token goes in the link; the stored row names it by its keyed hash.
 */
export async function issueLinkToken(
  db: Executor,
  hashKey: string,
  identifier: string,
  payload: string,
  now: Date,
  lifetimeSeconds = 24 * 60 * 60
): Promise<string> {
  const token = randomBytes(32).toString("base64url")
  await db.execute(
    sql`delete from platform.verifications where identifier like ${`${identifier}%`}`
  )
  await db.execute(sql`
    insert into platform.verifications (id, identifier, value, expires_at, created_at, updated_at)
    values (${randomUUID()}, ${`${identifier}:${keyedHash(hashKey, identifier, token)}`},
            ${payload},
            ${new Date(now.getTime() + lifetimeSeconds * 1000).toISOString()}, now(), now())`)
  return token
}

/** The payload of a valid link token, used up on reading; null when unknown or expired. */
export async function useLinkToken(
  db: Database,
  hashKey: string,
  identifier: string,
  token: string,
  now: Date
): Promise<string | null> {
  const key = `${identifier}:${keyedHash(hashKey, identifier, token)}`
  const result = await db.execute(sql`
    delete from platform.verifications where identifier = ${key}
    returning value, expires_at`)
  const row = result.rows[0]
  if (row === undefined) return null
  if (new Date(String(row.expires_at)) <= now) return null
  return String(row.value)
}
