"use client"

// Sign-in (spec: docs/specs/stage-1-sign-in.md, sections 2 and 3). Parents: phone
// number, then a 6-digit code by SMS. Staff: email or phone and password, then an
// authenticator code where their account has one.
import { useRouter } from "next/navigation"
import { useState, type SyntheticEvent, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import { authPost, fieldText } from "./auth-client"
import { Field } from "./field"

type Mode = "parent" | "staff"
type Step =
  | { kind: "parent-phone" }
  | { kind: "parent-code"; phoneNumber: string }
  | { kind: "staff-password" }
  | { kind: "staff-second-step"; useBackup: boolean }

const BUTTON = "h-11 w-full text-base"

export function SignInForm({
  schoolName,
  next,
}: {
  /** Shown first when the person came from a school's page. */
  schoolName: string | null
  /** Where to go once signed in. */
  next: string
}): JSX.Element {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("parent")
  const [step, setStep] = useState<Step>({ kind: "parent-phone" })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const choose = (chosen: Mode) => {
    setMode(chosen)
    setError(null)
    setNotice(null)
    setStep(
      chosen === "parent"
        ? { kind: "parent-phone" }
        : { kind: "staff-password" }
    )
  }

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } finally {
      setBusy(false)
    }
  }

  const done = () => {
    router.push(next)
    router.refresh()
  }

  const sendCode = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const phoneNumber = fieldText(new FormData(event.currentTarget), "phone")
    void run(async () => {
      const result = await authPost("/phone-number/send-otp", { phoneNumber })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setNotice(
        "If this number is registered with your school, we have sent a 6-digit code to it."
      )
      setStep({ kind: "parent-code", phoneNumber })
    })
  }

  const checkCode = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step.kind !== "parent-code") return
    const code = fieldText(new FormData(event.currentTarget), "code")
    void run(async () => {
      const result = await authPost("/phone-number/verify", {
        phoneNumber: step.phoneNumber,
        code,
      })
      if (result.ok) done()
      else setError(result.message)
    })
  }

  const signInStaff = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const account = fieldText(form, "account").trim()
    const password = fieldText(form, "password")
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
        setError(
          result.status === 429
            ? result.message
            : "That sign-in did not work. Check your email or phone number and password, and try again."
        )
        return
      }
      if (result.data.twoFactorRedirect === true) {
        setNotice(null)
        setStep({ kind: "staff-second-step", useBackup: false })
        return
      }
      done()
    })
  }

  const checkSecondStep = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step.kind !== "staff-second-step") return
    const code = fieldText(new FormData(event.currentTarget), "code").trim()
    void run(async () => {
      const result = step.useBackup
        ? await authPost("/two-factor/verify-backup-code", { code })
        : await authPost("/two-factor/verify-totp", { code })
      if (result.ok) done()
      else
        setError(
          "That code did not work. Check it and try again, or use a backup code."
        )
    })
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-heading text-2xl font-bold">
          {schoolName ?? "Sign in"}
        </h1>
        <p className="text-base text-muted-foreground">
          {schoolName === null
            ? "Your whole school, brought together."
            : "Sign in to continue."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(["parent", "staff"] as const).map((option) => (
          <Button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            variant={mode === option ? "default" : "outline"}
            className={BUTTON}
            onClick={() => {
              choose(option)
            }}
          >
            {option === "parent" ? "Parent" : "Staff"}
          </Button>
        ))}
      </div>

      {notice !== null && (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
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

      {step.kind === "parent-phone" && (
        <form className="flex flex-col gap-4" onSubmit={sendCode}>
          <Field
            id="phone"
            name="phone"
            label="Your phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Send code
          </Button>
        </form>
      )}

      {step.kind === "parent-code" && (
        <form className="flex flex-col gap-4" onSubmit={checkCode}>
          <Field
            id="code"
            name="code"
            label="The 6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Sign in
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={BUTTON}
            onClick={() => {
              setStep({ kind: "parent-phone" })
            }}
          >
            Use a different number
          </Button>
        </form>
      )}

      {step.kind === "staff-password" && (
        <form className="flex flex-col gap-4" onSubmit={signInStaff}>
          <Field
            id="account"
            name="account"
            label="Email or phone number"
            autoComplete="username"
            required
          />
          <Field
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Sign in
          </Button>
        </form>
      )}

      {step.kind === "staff-second-step" && (
        <form className="flex flex-col gap-4" onSubmit={checkSecondStep}>
          <Field
            id="code"
            name="code"
            label={
              step.useBackup
                ? "One of your backup codes"
                : "The code from your authenticator app"
            }
            inputMode={step.useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            required
          />
          <Button type="submit" className={BUTTON} disabled={busy}>
            Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={BUTTON}
            onClick={() => {
              setStep({ kind: "staff-second-step", useBackup: !step.useBackup })
            }}
          >
            {step.useBackup ? "Use my authenticator app" : "Use a backup code"}
          </Button>
        </form>
      )}
    </div>
  )
}
