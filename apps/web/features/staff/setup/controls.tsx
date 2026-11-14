"use client"

// Form controls the Setup screens share, at a full 44 px tap target (brief section 4).
import { useRouter } from "next/navigation"
import { useState, type ComponentProps, type JSX, type ReactNode } from "react"

import type { ActionResult } from "@akoso/core/kernel"
import { Label } from "@akoso/ui/components/label"
import { cn } from "@akoso/ui/lib/utils"

import {
  callAction,
  type ActionProblem,
} from "@/features/shared/actions/call-action"

export const BUTTON = "h-11 text-base"
export const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"
export const CHECK = "flex min-h-11 items-center gap-3 text-base"
const CONTROL =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

/** A labelled list of choices. */
export function SelectField({
  id,
  label,
  children,
  className,
  ...props
}: ComponentProps<"select"> & {
  id: string
  label: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={cn(CONTROL, className)} {...props}>
        {children}
      </select>
    </div>
  )
}

export interface SetupAction {
  run: <Data>(
    action: (input: unknown) => Promise<ActionResult<Data>>,
    input: unknown,
    done?: (data: Data) => string | null
  ) => Promise<Data | null>
  busy: boolean
  problem: ActionProblem | null
  notice: string | null
}

/**
 * Runs a Setup server action: every change is saved as it is made (spec, section 1).
 * On success the page reloads its data, and `done` may give a message to announce.
 */
export function useSetupAction(): SetupAction {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<ActionProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  return {
    busy,
    problem,
    notice,
    run: async (action, input, done) => {
      setBusy(true)
      setProblem(null)
      setNotice(null)
      try {
        const result = await callAction(action, input)
        if (!result.ok) {
          setProblem(result.problem)
          return null
        }
        setNotice(done?.(result.data) ?? "Saved.")
        router.refresh()
        return result.data
      } finally {
        setBusy(false)
      }
    },
  }
}

/** The outcome of the last change: a polite notice, or the problem as an alert. */
export function ActionStatus({
  action,
}: {
  action: Pick<SetupAction, "problem" | "notice">
}): JSX.Element {
  return (
    <div aria-live="polite" className="min-h-0">
      {action.problem !== null ? (
        <p
          role="alert"
          data-testid="form-error"
          className="text-base text-destructive"
        >
          {action.problem.message}
        </p>
      ) : action.notice !== null ? (
        <p role="status" data-testid="setup-notice" className="text-base">
          {action.notice}
        </p>
      ) : null}
    </div>
  )
}

/** The message for one field of the last problem, if any. */
export function fieldProblem(
  problem: ActionProblem | null,
  path: string
): string | undefined {
  return problem?.fields[path]
}
