// The browser half of passkeys (sign-in part B, section 8): ask the server for options,
// let the device create or use a passkey (fingerprint, face or PIN), send the result
// back. Plain fetch plus the WebAuthn helper; no sign-in library on the page.
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser"

export type PasskeyResult = { ok: true } | { ok: false; message: string }

const FALLBACK = "That didn't work. Please try again."

async function readMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as {
    message?: unknown
  }
  return typeof payload.message === "string" && payload.message !== ""
    ? payload.message
    : FALLBACK
}

/** A device refusal (cancelled, timed out) in plain words. */
function deviceMessage(error: unknown): string {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "The passkey request was cancelled or timed out. Please try again."
  }
  if (error instanceof Error && error.name === "InvalidStateError") {
    return "This device already has a passkey for your account."
  }
  return "Your device couldn't use a passkey. Try another device or a security key."
}

/**
 * Registers a passkey. With a `context` ticket (an enrolment link or a recovery code)
 * the person is signed in afterwards; without one, they must already be signed in.
 */
export async function registerPasskey(options: {
  context?: string
  name: string
}): Promise<PasskeyResult> {
  const query = new URLSearchParams()
  if (options.context !== undefined) query.set("context", options.context)
  const optionsResponse = await fetch(
    `/api/auth/passkey/generate-register-options?${query.toString()}`,
    { credentials: "same-origin" }
  )
  if (!optionsResponse.ok) {
    return { ok: false, message: await readMessage(optionsResponse) }
  }
  let response
  try {
    response = await startRegistration({
      optionsJSON:
        (await optionsResponse.json()) as PublicKeyCredentialCreationOptionsJSON,
    })
  } catch (error) {
    return { ok: false, message: deviceMessage(error) }
  }
  const verified = await fetch("/api/auth/passkey/verify-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      response,
      name: options.name,
      createSession: options.context !== undefined,
    }),
  })
  if (!verified.ok) return { ok: false, message: await readMessage(verified) }
  return { ok: true }
}

/** Signs in with a passkey the device holds. */
export async function signInWithPasskey(): Promise<PasskeyResult> {
  const optionsResponse = await fetch(
    "/api/auth/passkey/generate-authenticate-options",
    { credentials: "same-origin" }
  )
  if (!optionsResponse.ok) {
    return { ok: false, message: await readMessage(optionsResponse) }
  }
  let response
  try {
    response = await startAuthentication({
      optionsJSON:
        (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON,
    })
  } catch (error) {
    return { ok: false, message: deviceMessage(error) }
  }
  const verified = await fetch("/api/auth/passkey/verify-authentication", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ response }),
  })
  if (!verified.ok) return { ok: false, message: await readMessage(verified) }
  return { ok: true }
}

/** Signs out of the admin app. */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: "{}",
  })
}
