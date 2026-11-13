"use client"

// Runs an admin server action. When a change needs a recent sign-in, it asks for the
// passkey again, then tries once more (sign-in part B, section 8).
import { useState, type JSX } from "react"

import type { ActionResult } from "@akoso/core/kernel"

import { signInWithPasskey } from "./passkey-client"

export interface TeamActionRunner {
  run: <Data>(
    action: (input: unknown) => Promise<ActionResult<Data>>,
    input: unknown
  ) => Promise<Data | null>
  busy: boolean
  error: string | null
  fields: Record<string, string>
}

const FALLBACK =
  "Something went wrong. Please check your connection and try again."

export function useTeamAction(): TeamActionRunner {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const once = async <Data,>(
    action: (input: unknown) => Promise<ActionResult<Data>>,
    input: unknown
  ): Promise<ActionResult<Data> | null> => {
    try {
      return await action(input)
    } catch {
      setError(FALLBACK)
      return null
    }
  }

  const run: TeamActionRunner["run"] = async (action, input) => {
    setBusy(true)
    setError(null)
    setFields({})
    try {
      let result = await once(action, input)
      if (
        result !== null &&
        !result.ok &&
        result.error.code === "reauth_required"
      ) {
        const again = await signInWithPasskey()
        if (!again.ok) {
          setError(again.message)
          return null
        }
        result = await once(action, input)
      }
      if (result === null) return null
      if (result.ok) return result.data
      const next: Record<string, string> = {}
      let message = result.error.title
      for (const item of result.error.errors ?? []) {
        if (item.path === "") message = item.message
        else next[item.path] ??= item.message
      }
      if (Object.keys(next).length > 0 && message === result.error.title) {
        message = Object.values(next)[0] ?? message
      }
      setFields(next)
      setError(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error, fields }
}

export function ErrorText({
  error,
}: {
  error: string | null
}): JSX.Element | null {
  if (error === null) return null
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="text-base text-destructive"
    >
      {error}
    </p>
  )
}
