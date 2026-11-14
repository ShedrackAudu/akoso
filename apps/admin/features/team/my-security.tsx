"use client"

// My passkeys and recovery codes (sign-in part B, section 8): add a second passkey,
// remove one (never the last), and make new recovery codes.
import { useRouter } from "next/navigation"
import { useState, type JSX } from "react"

import type { MyTeamSecurity } from "@akoso/core/team"
import { time } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"

import {
  createRecoveryCodesAction,
  deletePasskeyAction,
} from "@/server/actions"

import { registerPasskey, signInWithPasskey } from "./passkey-client"
import { RecoveryCodes } from "./recovery-codes"
import { ErrorText, useTeamAction } from "./use-team-action"

const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"

export function MySecurity({
  security,
  recovered,
}: {
  security: MyTeamSecurity
  recovered: boolean
}): JSX.Element {
  const router = useRouter()
  const action = useTeamAction()
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [notice, setNotice] = useState<string | null>(
    recovered
      ? "You're signed in with your new passkey. Make new recovery codes now: one of your old ones is used."
      : null
  )

  const addPasskey = async () => {
    setError(null)
    let result = await registerPasskey({ name: "Another passkey" })
    if (!result.ok && /sign in again/i.test(result.message)) {
      const again = await signInWithPasskey()
      if (!again.ok) {
        setError(again.message)
        return
      }
      result = await registerPasskey({ name: "Another passkey" })
    }
    if (!result.ok) {
      setError(result.message)
      return
    }
    setNotice("Passkey added.")
    router.refresh()
  }

  const remove = async (id: string) => {
    const done = await action.run(deletePasskeyAction, { id })
    // A void action resolves to undefined on success, and null on failure.
    if (done === null) return
    setNotice("Passkey removed.")
    router.refresh()
  }

  const newCodes = async () => {
    const created = await action.run(createRecoveryCodesAction, {})
    if (created !== null) setCodes(created.codes)
  }

  return (
    <div className="flex flex-col gap-6">
      {notice !== null && (
        <p role="status" className="text-sm" data-testid="security-notice">
          {notice}
        </p>
      )}
      <ErrorText error={error ?? action.error} />

      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Passkeys</h2>
        <ul
          className="flex flex-col divide-y divide-border"
          data-testid="passkeys"
        >
          {security.passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{passkey.name}</span>
                <span className="text-sm text-muted-foreground">
                  Added{" "}
                  {time.formatDateTime(
                    new Date(passkey.createdAt),
                    "Africa/Lagos"
                  )}
                </span>
              </span>
              {security.passkeys.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={action.busy}
                  onClick={() => void remove(passkey.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        {security.passkeys.length < 2 && (
          <p className="text-sm text-muted-foreground">
            Add a second passkey, such as a security key or another phone, so
            losing one device doesn&apos;t lock you out.
          </p>
        )}
        <Button
          type="button"
          disabled={action.busy}
          onClick={() => void addPasskey()}
        >
          Add a passkey
        </Button>
      </section>

      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Recovery codes</h2>
        <p className="text-sm" data-testid="codes-left">
          {security.recoveryCodesLeft} of 10 unused.
        </p>
        {codes !== null ? (
          <RecoveryCodes codes={codes} />
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={action.busy}
            onClick={() => void newCodes()}
          >
            Make new recovery codes
          </Button>
        )}
      </section>
    </div>
  )
}
