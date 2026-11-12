import type { Metadata } from "next"
import type { JSX } from "react"

import { getSecurityStatus } from "@akoso/core/identity"

import { SecuritySettings } from "@/features/shared/auth/security-settings"
import { requireSignedIn } from "@/server/session"

export const metadata: Metadata = { title: "Sign-in and security" }
export const dynamic = "force-dynamic"

export default async function SecurityPage(): Promise<JSX.Element> {
  // Reachable without the second step: this is where it is set up.
  const ctx = await requireSignedIn(null, { allowWithoutMfa: true })
  const status = await getSecurityStatus(ctx)
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <SecuritySettings {...status} />
    </main>
  )
}
