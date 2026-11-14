"use client"

// Account security (spec section 6): set up the second step, change password, sign
// out everywhere. Staff whose role needs a second step are sent here until it is set up.
import { useRouter } from "next/navigation"
import { useState, type SyntheticEvent, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { authPost, fieldText } from "./auth-client"
import { Field } from "./field"

const BUTTON = "w-full"

/** The secret inside an otpauth:// address, for typing into an authenticator by hand. */
function secretOf(totpUri: string): string {
  try {
    return new URL(totpUri).searchParams.get("secret") ?? ""
  } catch {
    return ""
  }
}

export function SecuritySettings({
  mfaEnabled,
  mfaRequired,
  hasPassword,
}: {
  mfaEnabled: boolean
  mfaRequired: boolean
  /** Parents sign in by code and have no password, so no second step to manage. */
  hasPassword: boolean
}): JSX.Element {
  const router = useRouter()
  const [setup, setSetup] = useState<{
    totpUri: string
    backupCodes: string[]
  } | null>(null)
  const [enabled, setEnabled] = useState(mfaEnabled)
  const [shownCodes, setShownCodes] = useState<string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await work()
    } finally {
      setBusy(false)
    }
  }

  const startSetup = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = fieldText(new FormData(event.currentTarget), "password")
    void run(async () => {
      const result = await authPost<{ totpURI: string; backupCodes: string[] }>(
        "/two-factor/enable",
        { password }
      )
      if (!result.ok) {
        setError("That password is not right. Please try again.")
        return
      }
      setSetup({
        totpUri: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      })
    })
  }

  const confirmSetup = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (setup === null) return
    const code = fieldText(new FormData(event.currentTarget), "code")
    void run(async () => {
      const result = await authPost("/two-factor/verify-totp", { code })
      if (!result.ok) {
        setError(
          "That code did not work. Check the time on your phone and try again."
        )
        return
      }
      setEnabled(true)
      setShownCodes(setup.backupCodes)
      setSetup(null)
    })
  }

  const changePassword = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void run(async () => {
      const result = await authPost("/change-password", {
        currentPassword: fieldText(form, "current"),
        newPassword: fieldText(form, "new"),
        revokeOtherSessions: true,
      })
      if (result.ok) {
        setMessage(
          "Password changed. You have been signed out on your other devices."
        )
      } else setError(result.message)
    })
  }

  const signOutEverywhere = () => {
    void run(async () => {
      await authPost("/revoke-sessions")
      router.push("/sign-in")
      router.refresh()
    })
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {message !== null && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {error !== null && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="form-error"
        >
          {error}
        </p>
      )}

      {hasPassword && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold">
            Second sign-in step
          </h2>
          {mfaRequired && !enabled && (
            <p className="text-sm">
              Your role needs a second sign-in step. Please set it up to
              continue.
            </p>
          )}
          {enabled && shownCodes === null && (
            <p className="text-sm text-muted-foreground">
              Your authenticator app is set up.
            </p>
          )}

          {!enabled && setup === null && (
            <SafeForm className="flex flex-col gap-4" onSubmit={startSetup}>
              <p className="text-sm text-muted-foreground">
                You will need an authenticator app on your phone, such as Google
                Authenticator or Microsoft Authenticator.
              </p>
              <Field
                id="setup-password"
                name="password"
                label="Your password, to confirm"
                type="password"
                autoComplete="current-password"
                required
              />
              <Button type="submit" className={BUTTON} disabled={busy}>
                Set up authenticator app
              </Button>
            </SafeForm>
          )}

          {setup !== null && (
            <SafeForm className="flex flex-col gap-4" onSubmit={confirmSetup}>
              <p className="text-sm">
                On your phone, open this link to add Akoso to your authenticator
                app, or type the key below into it.
              </p>
              <a
                href={setup.totpUri}
                className="text-sm font-medium text-foreground underline underline-offset-4"
              >
                Add to my authenticator app
              </a>
              <p
                className="font-mono text-sm break-all"
                data-testid="totp-secret"
              >
                {secretOf(setup.totpUri)}
              </p>
              <Field
                id="setup-code"
                name="code"
                label="The 6-digit code your app shows"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              <Button type="submit" className={BUTTON} disabled={busy}>
                Confirm
              </Button>
            </SafeForm>
          )}

          {shownCodes !== null && (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Your authenticator app is set up. These backup codes let you
                sign in if you lose your phone. Each works once. Write them down
                and keep them safe: they will not be shown again.
              </p>
              <ul
                className="grid grid-cols-2 gap-2 font-mono text-sm"
                data-testid="backup-codes"
              >
                {shownCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
              <Button
                type="button"
                className={BUTTON}
                onClick={() => {
                  router.push("/schools")
                  router.refresh()
                }}
              >
                I have saved them. Continue
              </Button>
            </div>
          )}
        </section>
      )}

      {hasPassword && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold">
            Change password
          </h2>
          <SafeForm className="flex flex-col gap-4" onSubmit={changePassword}>
            <Field
              id="current"
              name="current"
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Field
              id="new"
              name="new"
              label="New password (at least 10 characters)"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <Button
              type="submit"
              variant="outline"
              className={BUTTON}
              disabled={busy}
            >
              Change password
            </Button>
          </SafeForm>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">Devices</h2>
        <Button
          type="button"
          variant="outline"
          className={BUTTON}
          disabled={busy}
          onClick={signOutEverywhere}
        >
          Sign out everywhere
        </Button>
      </section>
    </div>
  )
}
