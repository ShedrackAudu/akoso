import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { confirmEmailChange } from "@akoso/core/identity"
import { createLogger, getDatabase, newRequestId } from "@akoso/core/kernel"
import { confirmEmailChangeInput } from "@akoso/schemas/identity"

// The link in a "confirm your email" message (sign-in part B, section 4). The token in
// the link is the proof, so it needs no sign-in; it works once.
export const metadata: Metadata = { title: "Confirm your email" }
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<Record<string, string | string[]>> }

export default async function ConfirmEmailPage({
  searchParams,
}: Props): Promise<JSX.Element> {
  const params = await searchParams
  const input = confirmEmailChangeInput.safeParse({
    userId: params.user,
    token: params.token,
  })
  const requestId = newRequestId()
  const confirmed =
    input.success &&
    (await confirmEmailChange(
      {
        requestId,
        db: getDatabase(),
        now: () => new Date(),
        log: createLogger({ requestId }),
      },
      input.data
    ))
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-2xl font-bold">
        {confirmed ? "Email confirmed" : "This link doesn't work"}
      </h1>
      <p
        className="text-sm text-muted-foreground"
        data-testid="email-confirm-result"
      >
        {confirmed
          ? "You can now sign in with your new email."
          : "It may have been used already, or be more than a day old. Please ask for a new one from My account."}
      </p>
      <Link
        href="/account"
        className="text-sm text-foreground underline underline-offset-4"
      >
        Go to My account
      </Link>
    </main>
  )
}
