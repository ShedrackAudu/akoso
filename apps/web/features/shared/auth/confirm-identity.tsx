"use client"

// "Confirm it's you" before a risky change (sign-in part B, section 1, rule 6): a fresh
// sign-in on this device, by password and second step, or by a code to the phone for
// people without a password. Then the change is tried again.
import { useState, type JSX, type SyntheticEvent } from "react"

import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { authPost, fieldText } from "./auth-client"
import { Field } from "./field"

const BUTTON = "h-11 text-base"

export interface ConfirmIdentityProps {
  /** How this person signs in: with a password (staff) or a code (parents). */
  hasPassword: boolean
  /** Their email or phone number for a password sign-in, or phone for a code. */
  account: string
  onConfirmed: () => void
  onCancel: () => void
}

export function ConfirmIdentity({
  hasPassword,
  account,
  onConfirmed,
  onCancel,
}: ConfirmIdentityProps): JSX.Element {
  const [step, setStep] = useState<"start" | "second" | "code">("start")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } finally {
      setBusy(false)
    }
  }

  const withPassword = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = fieldText(new FormData(event.currentTarget), "password")
    void run(async () => {
      const result = account.includes("@")
        ? await authPost<{ twoFactorRedirect?: boolean }>("/sign-in/email", {
            email: account,
            password,
          })
        : await authPost<{ twoFactorRedirect?: boolean }>(
            "/sign-in/phone-number",
            { phoneNumber: account, password }
          )
      if (!result.ok) {
        setError(result.message)
        return
      }
      if (result.data.twoFactorRedirect === true) setStep("second")
      else onConfirmed()
    })
  }

  const withSecondStep = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = fieldText(new FormData(event.currentTarget), "code").trim()
    void run(async () => {
      const result =
        code.length > 6
          ? await authPost("/two-factor/verify-backup-code", { code })
          : await authPost("/two-factor/verify-totp", { code })
      if (!result.ok) {
        setError("That code is not right. Please try again.")
        return
      }
      onConfirmed()
    })
  }

  const sendCode = () => {
    void run(async () => {
      const result = await authPost("/phone-number/send-otp", {
        phoneNumber: account,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setStep("code")
    })
  }

  const withCode = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = fieldText(new FormData(event.currentTarget), "code").trim()
    void run(async () => {
      const result = await authPost("/phone-number/verify", {
        phoneNumber: account,
        code,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      onConfirmed()
    })
  }

  return (
    <section
      aria-labelledby="confirm-identity-title"
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
      data-testid="confirm-identity"
    >
      <h2 id="confirm-identity-title" className="text-lg font-semibold">
        Confirm it's you
      </h2>
      <p className="text-base text-muted-foreground">
        For your security, sign in again before this change.
      </p>
      {hasPassword && step === "start" && (
        <SafeForm onSubmit={withPassword} className="flex flex-col gap-4">
          <Field
            id="confirm-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Confirm
          </Button>
        </SafeForm>
      )}
      {step === "second" && (
        <SafeForm onSubmit={withSecondStep} className="flex flex-col gap-4">
          <Field
            id="confirm-second-step"
            name="code"
            label="Code from your authenticator app, or a backup code"
            inputMode="text"
            autoComplete="one-time-code"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Confirm
          </Button>
        </SafeForm>
      )}
      {!hasPassword && step === "start" && (
        <Button
          type="button"
          className={BUTTON}
          disabled={busy}
          onClick={sendCode}
        >
          Send a code to {account}
        </Button>
      )}
      {step === "code" && (
        <SafeForm onSubmit={withCode} className="flex flex-col gap-4">
          <Field
            id="confirm-code"
            name="code"
            label="The 6-digit code we sent"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Confirm
          </Button>
        </SafeForm>
      )}
      {error !== null && (
        <p
          role="alert"
          data-testid="form-error"
          className="text-base text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        className={BUTTON}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </section>
  )
}
