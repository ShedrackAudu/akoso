"use client"

// Signing in to the admin app: a passkey, nothing else (sign-in part B, section 8).
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import { signInWithPasskey } from "./passkey-client"
import { ErrorText } from "./use-team-action"

export function SignIn(): JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = () => {
    setBusy(true)
    setError(null)
    void signInWithPasskey().then((result) => {
      setBusy(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.push("/")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        className="h-11 text-base"
        disabled={busy}
        onClick={signIn}
      >
        Sign in with your passkey
      </Button>
      <ErrorText error={error} />
      <Link href="/recover" className="text-base text-primary underline">
        Lost your passkey? Use a recovery code
      </Link>
    </div>
  )
}
