import { createHmac, timingSafeEqual } from "node:crypto"

/** How far a webhook's signing time may be from ours (Paystack's documented window). */
export const WEBHOOK_TOLERANCE_SECONDS = 300

export type WebhookCheck =
  | { ok: true; keyId: string }
  | { ok: false; reason: "missing" | "malformed" | "stale" | "mismatch" }

const HEX_128 = /^[0-9a-f]{128}$/

/**
 * Checks a Paystack webhook's `Paystack-Signature` header, as Paystack documents it
 * (checked 11/11/2026): `t=<unix seconds>,v1=<key id>:<hex HMAC>[,v1=...]`, where each
 * HMAC is SHA-512 of `${t}.` followed by the raw body, keyed with the webhook signing
 * secret (`whsec_...`).
 *
 * @param rawBody The request body exactly as received, before any JSON parsing.
 * @param header The `Paystack-Signature` header, or null if absent.
 * @param secrets Every signing secret currently in use (two during a rotation).
 * @param nowSeconds The server's time; passed in so tests can fix it.
 * @returns Which key matched, or why the webhook was refused. Never throws.
 */
export function checkPaystackSignature(
  rawBody: Uint8Array,
  header: string | null,
  secrets: readonly string[],
  nowSeconds: number = Math.floor(Date.now() / 1000)
): WebhookCheck {
  if (header === null || header.trim() === "") {
    return { ok: false, reason: "missing" }
  }

  let timestamp: number | null = null
  const signatures: { keyId: string; hex: string }[] = []
  for (const part of header.split(",")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key === "t") {
      // Two timestamps, or a non-number, means the header was tampered with.
      if (timestamp !== null || !/^[0-9]+$/.test(value)) {
        return { ok: false, reason: "malformed" }
      }
      timestamp = Number(value)
    } else if (key === "v1") {
      const colon = value.indexOf(":")
      if (colon !== -1) {
        signatures.push({
          keyId: value.slice(0, colon),
          hex: value.slice(colon + 1),
        })
      }
    }
  }
  if (timestamp === null || signatures.length === 0) {
    return { ok: false, reason: "malformed" }
  }
  if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" }
  }

  for (const secret of secrets) {
    const expected = createHmac("sha512", secret)
      .update(`${String(timestamp)}.`)
      .update(rawBody)
      .digest()
    for (const { keyId, hex } of signatures) {
      if (
        HEX_128.test(hex) &&
        timingSafeEqual(expected, Buffer.from(hex, "hex"))
      ) {
        return { ok: true, keyId }
      }
    }
  }
  return { ok: false, reason: "mismatch" }
}

/** Builds a signature header the way Paystack does. For tests and the fake provider. */
export function signLikePaystack(
  rawBody: Uint8Array,
  secret: string,
  keyId: string,
  timestamp: number
): string {
  const hex = createHmac("sha512", secret)
    .update(`${String(timestamp)}.`)
    .update(rawBody)
    .digest("hex")
  return `t=${String(timestamp)},v1=${keyId}:${hex}`
}
