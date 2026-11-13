"use client"

// The security log (sign-in part B, section 3): newest first, in the school's time,
// with "failures only" and more pages on request.
import { useState, type JSX } from "react"

import type { SecurityLogEntry } from "@akoso/core/identity"
import { time } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"

import { callAction } from "@/features/shared/actions/call-action"
import { readSecurityLogAction } from "@/server/actions/identity"

type Page = { data: SecurityLogEntry[]; nextCursor: string | null }

const KIND_LABELS: Record<SecurityLogEntry["kind"], string> = {
  sign_in: "Signed in",
  sign_in_failed: "Sign-in failed",
  code_sent: "Sign-in code sent",
  account_locked: "Locked after too many attempts",
  mfa_enabled: "Turned on the second step",
  mfa_disabled: "Turned off the second step",
  password_changed: "Changed password",
  password_reset: "Reset password",
  sessions_revoked: "Signed out everywhere",
  roles_changed: "Roles changed by the school",
  membership_suspended: "Access suspended by the school",
  membership_reactivated: "Access restored by the school",
  membership_ended: "Left the school",
  phone_changed: "Sign-in number changed",
  backup_phone_added: "Added a backup number",
  backup_phone_removed: "Removed the backup number",
  mfa_reset: "Second step reset by the school",
  email_changed: "Changed email",
  profile_changed: "Changed their name",
  account_deleted: "Deleted their account",
}

const DEVICE_LABELS = {
  phone: "Phone",
  tablet: "Tablet",
  computer: "Computer",
  unknown: "Unknown device",
}

const FAILURES = new Set(["sign_in_failed", "account_locked"])

export function SecurityLogView({
  school,
  timeZone,
  first,
}: {
  school: string
  timeZone: string
  first: Page
}): JSX.Element {
  const [entries, setEntries] = useState(first.data)
  const [cursor, setCursor] = useState(first.nextCursor)
  const [failuresOnly, setFailuresOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (options: { failuresOnly: boolean; cursor?: string }) => {
    setBusy(true)
    setError(null)
    const result = await callAction(readSecurityLogAction, {
      school,
      failuresOnly: options.failuresOnly,
      ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.problem.message)
      return
    }
    setEntries((before) =>
      options.cursor === undefined
        ? result.data.data
        : [...before, ...result.data.data]
    )
    setCursor(result.data.nextCursor)
  }

  const lockedRecently = entries.some(
    (entry) => entry.kind === "account_locked"
  )

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      {lockedRecently && (
        <p role="status" className="rounded-md bg-muted p-3 text-base">
          Someone's account was locked after too many wrong sign-ins. If that
          wasn't them, ask them to change their password.
        </p>
      )}
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          className="size-5"
          checked={failuresOnly}
          onChange={(event) => {
            setFailuresOnly(event.target.checked)
            void load({ failuresOnly: event.target.checked })
          }}
        />
        Show failed sign-ins and locks only
      </label>
      {error !== null && (
        <p
          role="alert"
          data-testid="form-error"
          className="text-base text-destructive"
        >
          {error}
        </p>
      )}
      {entries.length === 0 ? (
        <p className="text-base text-muted-foreground">Nothing to show yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between"
              data-testid="security-log-entry"
            >
              <span className="flex flex-col">
                <span className="text-base font-semibold">{entry.name}</span>
                <span
                  className={
                    FAILURES.has(entry.kind)
                      ? "text-base text-destructive"
                      : "text-base"
                  }
                >
                  {KIND_LABELS[entry.kind]}
                </span>
              </span>
              <span className="flex flex-col text-base text-muted-foreground sm:items-end">
                <span>{time.formatDateTime(new Date(entry.at), timeZone)}</span>
                {!entry.causedBySchool && (
                  <span>
                    {DEVICE_LABELS[entry.device]}
                    {entry.ipAddress === null ? "" : ` · ${entry.ipAddress}`}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {cursor !== null && (
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          disabled={busy}
          onClick={() => {
            void load({ failuresOnly, cursor })
          }}
        >
          Show older
        </Button>
      )}
    </section>
  )
}
