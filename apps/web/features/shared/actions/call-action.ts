// Calls a server action and turns its answer into what a form shows: the data, or one
// plain message plus any per-field messages. `reauth` says the change needs the person
// to confirm it's them first (sign-in part B, section 1, rule 6).
import type { ActionResult } from "@akoso/core/kernel"

export interface ActionProblem {
  message: string
  fields: Record<string, string>
  reauth: boolean
}

export type CallResult<Data> =
  { ok: true; data: Data } | { ok: false; problem: ActionProblem }

const FALLBACK =
  "Something went wrong. Please check your connection and try again."

export async function callAction<Data>(
  action: (input: unknown) => Promise<ActionResult<Data>>,
  input: unknown
): Promise<CallResult<Data>> {
  let result: ActionResult<Data>
  try {
    result = await action(input)
  } catch {
    return {
      ok: false,
      problem: { message: FALLBACK, fields: {}, reauth: false },
    }
  }
  if (result.ok) return { ok: true, data: result.data }
  const fields: Record<string, string> = {}
  let message = result.error.title
  for (const error of result.error.errors ?? []) {
    if (error.path === "") message = error.message
    else fields[error.path] ??= error.message
  }
  if (Object.keys(fields).length > 0 && message === result.error.title) {
    message = Object.values(fields)[0] ?? message
  }
  return {
    ok: false,
    problem: {
      message,
      fields,
      reauth: result.error.code === "reauth_required",
    },
  }
}
