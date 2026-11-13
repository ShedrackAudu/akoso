"use client"

import { useRouter } from "next/navigation"
import type { JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import { signOut } from "./passkey-client"

export function SignOutButton(): JSX.Element {
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 text-base"
      onClick={() => {
        void signOut().then(() => {
          router.push("/sign-in")
        })
      }}
    >
      Sign out
    </Button>
  )
}
