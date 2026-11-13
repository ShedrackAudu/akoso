import type { Metadata } from "next"
import type { JSX } from "react"

import { SignIn } from "@/features/team/sign-in"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold">Akoso Admin</h1>
        <p className="text-base text-muted-foreground">
          For the Akoso team only.
        </p>
      </div>
      <SignIn />
    </main>
  )
}
