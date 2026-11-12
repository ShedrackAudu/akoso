// A small client for Akoso's sign-in endpoints (/api/auth/*). Plain fetch, so parents'
// phones download no sign-in library. Answers are either the data or a plain message.
export type AuthResult<Data> =
  { ok: true; data: Data } | { ok: false; status: number; message: string }

const FALLBACK =
  "Something went wrong. Please check your connection and try again."

export async function authPost<Data = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<AuthResult<Data>> {
  try {
    const response = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    if (response.ok) return { ok: true, data: payload as Data }
    const message =
      typeof payload.message === "string" && payload.message !== ""
        ? payload.message
        : response.status === 429
          ? "Too many attempts in a short time. Please wait and try again."
          : FALLBACK
    return { ok: false, status: response.status, message }
  } catch {
    return { ok: false, status: 0, message: FALLBACK }
  }
}

/** A form field's text, or "" when it is missing or a file. */
export function fieldText(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}
