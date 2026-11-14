"use client"

// Runs server actions for a form, asking the person to confirm it's them when a change
// needs a recent sign-in, then trying again (sign-in part B, section 1, rule 6).
import { useState, type JSX } from "react"

import type { ActionResult } from "@akoso/core/kernel"

import {
  ConfirmIdentity,
  type ConfirmIdentityProps,
} from "../auth/confirm-identity"
import { callAction, type ActionProblem } from "./call-action"

export interface GuardedAction {
  /** Runs the action; resolves to its data, or null when it failed or waits on a confirm. */
  run: <Data>(
    action: (input: unknown) => Promise<ActionResult<Data>>,
    input: unknown,
    onDone?: (data: Data) => void
  ) => Promise<Data | null>
  busy: boolean
  problem: ActionProblem | null
  clearProblem: () => void
  /** The "confirm it's you" panel while one is needed; render it near the form. */
  confirm: JSX.Element | null
}

export function useGuardedAction(
  identity: Pick<ConfirmIdentityProps, "hasPassword" | "account">
): GuardedAction {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<ActionProblem | null>(null)
  const [retry, setRetry] = useState<(() => void) | null>(null)

  const run: GuardedAction["run"] = async (action, input, onDone) => {
    setBusy(true)
    setProblem(null)
    try {
      const result = await callAction(action, input)
      if (result.ok) {
        onDone?.(result.data)
        return result.data
      }
      if (result.problem.reauth) {
        setRetry(() => () => {
          setRetry(null)
          void run(action, input, onDone)
        })
        return null
      }
      setProblem(result.problem)
      return null
    } finally {
      setBusy(false)
    }
  }

  return {
    run,
    busy,
    problem,
    clearProblem: () => {
      setProblem(null)
    },
    confirm:
      retry === null ? null : (
        <ConfirmIdentity
          {...identity}
          onConfirmed={retry}
          onCancel={() => {
            setRetry(null)
          }}
        />
      ),
  }
}

/** The form's error line, when there is one. */
export function ProblemText({
  problem,
}: {
  problem: ActionProblem | null
}): JSX.Element | null {
  if (problem === null) return null
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="text-sm text-destructive"
    >
      {problem.message}
    </p>
  )
}
