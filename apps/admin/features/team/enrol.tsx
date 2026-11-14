"use client"

// Opening an enrolment link: create a passkey, which also signs you in, then save your
// recovery codes (sign-in part B, section 8).
import { useRouter } from "next/navigation"
import { useState, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import {
  createRecoveryCodesAction,
  startEnrolmentAction,
} from "@/server/actions"

import { registerPasskey } from "./passkey-client"
import { RecoveryCodes } from "./recovery-codes"
import { ErrorText, useTeamAction } from "./use-team-action"

export function Enrol({ token }: { token: string }): JSX.Element {
  const router = useRouter()
  const action = useTeamAction()
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)

  const enrol = async () => {
    setError(null)
    const started = await action.run(startEnrolmentAction, { token })
    if (started === null) return
    const registered = await registerPasskey({
      context: started.ticket,
      name: "First passkey",
    })
    if (!registered.ok) {
      setError(registered.message)
      return
    }
    const created = await action.run(createRecoveryCodesAction, {})
    if (created !== null) setCodes(created.codes)
  }

  if (codes !== null) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm font-semibold">
          Your passkey is ready and you&apos;re signed in.
        </p>
        <RecoveryCodes codes={codes} />
        <Button
          type="button"
          onClick={() => {
            router.push("/")
          }}
        >
          I&apos;ve saved them. Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Your device will ask for your fingerprint, face or PIN, and save a
        passkey for Akoso Admin. Use it to sign in from now on. Once you&apos;re
        in, add a second passkey, such as a security key.
      </p>
      <Button type="button" disabled={action.busy} onClick={() => void enrol()}>
        Create your passkey
      </Button>
      <ErrorText error={error ?? action.error} />
    </div>
  )
}
