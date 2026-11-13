"use client"

// A recovery code, used once: register a new passkey, which signs you in (sign-in part
// B, section 8). The Owner sees that a code was used.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { startRecoveryAction } from "@/server/actions"

import { Field } from "./field"
import { registerPasskey } from "./passkey-client"
import { ErrorText, useTeamAction } from "./use-team-action"

const text = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

export function Recover(): JSX.Element {
  const router = useRouter()
  const action = useTeamAction()
  const [error, setError] = useState<string | null>(null)

  const recover = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const started = await action.run(startRecoveryAction, {
      email: text(form, "email"),
      code: text(form, "code"),
    })
    if (started === null) return
    const registered = await registerPasskey({
      context: started.ticket,
      name: "Passkey after recovery",
    })
    if (!registered.ok) {
      setError(registered.message)
      return
    }
    router.push("/security?recovered=1")
  }

  return (
    <SafeForm
      onSubmit={(event) => void recover(event)}
      className="flex flex-col gap-4"
    >
      <Field
        id="email"
        name="email"
        label="Your email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        id="code"
        name="code"
        label="One of your recovery codes"
        autoComplete="off"
        required
      />
      <Button type="submit" className="h-11 text-base" disabled={action.busy}>
        Use code and create a new passkey
      </Button>
      <ErrorText error={error ?? action.error} />
    </SafeForm>
  )
}
