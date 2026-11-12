import type { Metadata } from "next"
import type { JSX } from "react"

import { SignInForm } from "@/features/shared/auth/sign-in-form"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage(): JSX.Element {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <SignInForm schoolName={null} next="/schools" />
    </main>
  )
}
