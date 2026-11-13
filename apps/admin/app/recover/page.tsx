import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { Recover } from "@/features/team/recover"

export const metadata: Metadata = { title: "Use a recovery code" }

export default function RecoverPage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="font-heading text-2xl font-bold">Use a recovery code</h1>
      <p className="text-base text-muted-foreground">
        Each code works once. You&apos;ll create a new passkey straight away.
      </p>
      <Recover />
      <Link href="/sign-in" className="text-base text-primary underline">
        Back to sign-in
      </Link>
    </main>
  )
}
