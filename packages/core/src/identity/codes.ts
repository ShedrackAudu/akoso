// Sign-in and reset codes sent by SMS are stored only as keyed hashes (brief sections 6
// and 28; spec section 2). Better Auth writes "<code>:<attempts>"; a database hook
// replaces the code with an HMAC before the row is saved, and this module checks a
// typed code against it, counting attempts and honouring expiry.
import { createHmac, timingSafeEqual } from "node:crypto"

import { sql, type Database } from "@akoso/db"

/** Identifiers Better Auth uses for phone codes: the number, or the number plus a suffix. */
const PHONE_CODE_IDENTIFIER = /^\+[1-9][0-9]{6,14}(-request-password-reset)?$/
const PLAIN_CODE_VALUE = /^(\d{4,8}):(\d+)$/

const keyedHash = (secret: string, identifier: string, code: string): string =>
  createHmac("sha256", secret).update(`${identifier}\n${code}`).digest("hex")

/**
 * The value to store for a new verification row: the code replaced by its keyed hash.
 * Rows that are not phone codes pass through unchanged.
 */
export function protectStoredCode(
  secret: string,
  identifier: string,
  value: string
): string {
  const match = PLAIN_CODE_VALUE.exec(value)
  if (!PHONE_CODE_IDENTIFIER.test(identifier) || match === null) return value
  return `${keyedHash(secret, identifier, match[1] ?? "")}:${match[2] ?? "0"}`
}

/**
 * Checks a typed code against the newest stored one for `identifier`. A wrong code
 * counts an attempt; the third wrong attempt, or an expired code, removes it. Better
 * Auth removes the code after a correct one.
 */
export async function checkStoredCode(
  db: Database,
  secret: string,
  identifier: string,
  code: string,
  now: Date,
  allowedAttempts = 3
): Promise<boolean> {
  const result = await db.execute(sql`
    select id, value, expires_at from platform.verifications
    where identifier = ${identifier}
    order by created_at desc limit 1`)
  const row = result.rows[0]
  if (row === undefined) return false
  const id = String(row.id)
  const [storedHash = "", rawAttempts = "0"] = String(row.value).split(":")
  const attempts = Number(rawAttempts)
  const expired = new Date(String(row.expires_at)) <= now
  if (expired || attempts >= allowedAttempts) {
    await db.execute(sql`delete from platform.verifications where id = ${id}`)
    return false
  }
  const typed = Buffer.from(keyedHash(secret, identifier, code.trim()), "hex")
  const stored = Buffer.from(storedHash, "hex")
  if (stored.length === typed.length && timingSafeEqual(stored, typed)) {
    return true
  }
  if (attempts + 1 >= allowedAttempts) {
    await db.execute(sql`delete from platform.verifications where id = ${id}`)
  } else {
    await db.execute(sql`
      update platform.verifications
      set value = ${`${storedHash}:${String(attempts + 1)}`}, updated_at = now()
      where id = ${id}`)
  }
  return false
}
