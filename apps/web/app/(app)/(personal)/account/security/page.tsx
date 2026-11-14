import type { Metadata } from "next"
import type { JSX } from "react"

import { getSecurityStatus } from "@akoso/core/identity"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { SecuritySettings } from "@/features/shared/auth/security-settings"
import { requireSignedIn } from "@/server/session"

export const metadata: Metadata = { title: "Sign-in and security" }
export const dynamic = "force-dynamic"

export default async function SecurityPage(): Promise<JSX.Element> {
  // Reachable without the second step: this is where it is set up.
  const ctx = await requireSignedIn(null, { allowWithoutMfa: true })
  const status = await getSecurityStatus(ctx)
  return (
    <PageBody width="narrow">
      <PageHeader title="Sign-in and security" />
      <SecuritySettings {...status} />
    </PageBody>
  )
}
