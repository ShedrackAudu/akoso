"use client"

import { useRouter } from "next/navigation"
import { useState, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import { authPost } from "./auth-client"

export function SignOutButton(): JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 text-base"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void authPost("/sign-out").then(() => {
          router.push("/sign-in")
          router.refresh()
        })
      }}
    >
      Sign out
    </Button>
  )
}
