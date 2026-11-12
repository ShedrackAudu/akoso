// Helpers for the sign-in tests: the fake SMS outbox and authenticator codes.
import { createHmac } from "node:crypto"
import { existsSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const OUTBOX = join(tmpdir(), "akoso-e2e-sms-outbox.json")

/** Forgets every message, so a test only sees what it caused. */
export function clearSmsOutbox(): void {
  rmSync(OUTBOX, { force: true })
}

/** The 6-digit code in the newest SMS to a number, or null if none was sent. */
export function lastCodeSentTo(e164: string): string | null {
  if (!existsSync(OUTBOX)) return null
  const latest = JSON.parse(readFileSync(OUTBOX, "utf8")) as Record<
    string,
    string
  >
  return /\b(\d{6})\b/.exec(latest[e164] ?? "")?.[1] ?? null
}

/** Waits briefly for the fake SMS (it is sent in the background). */
export async function waitForCode(e164: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = lastCodeSentTo(e164)
    if (code !== null) return code
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`No code was sent to ${e164}`)
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(char)
    if (index >= 0) bits += index.toString(2).padStart(5, "0")
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

/** The current 6-digit authenticator code for a base-32 secret (RFC 6238). */
export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)))
  const digest = createHmac("sha1", base32Decode(secret))
    .update(counter)
    .digest()
  const offset = (digest.at(-1) ?? 0) & 0x0f
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return value.toString().padStart(6, "0")
}

/** The seeded people (packages/db/scripts/seed.mjs). Local-only test passwords. */
export const PEOPLE = {
  proprietor: {
    email: "proprietor@greenfield.test",
    password: "Greenfield-proprietor-local",
  },
  bursar: {
    email: "bursar@greenfield.test",
    password: "Greenfield-bursar-local",
  },
  teacher: {
    email: "teacher@greenfield.test",
    phone: "0803 100 0003",
    password: "Greenfield-teacher-local",
  },
  parent: { phone: "0803 100 0011", e164: "+2348031000011" },
  parentTwoSchools: { phone: "08031000012", e164: "+2348031000012" },
} as const
