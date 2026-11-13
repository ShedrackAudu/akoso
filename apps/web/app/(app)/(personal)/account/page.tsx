import type { Metadata } from "next"
import type { JSX } from "react"

import { getMyAccount, getSecurityStatus } from "@akoso/core/identity"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { AccountSettings } from "@/features/shared/account/account-settings"
import { requireSignedIn } from "@/server/session"

// My account (sign-in part B, section 4): name, email, numbers, deleting the account.
export const metadata: Metadata = { title: "My account" }
export const dynamic = "force-dynamic"

export default async function AccountPage(): Promise<JSX.Element> {
  const ctx = await requireSignedIn(null)
  const [account, security] = await Promise.all([
    getMyAccount(ctx),
    getSecurityStatus(ctx),
  ])
  return (
    <PageBody width="narrow">
      <PageHeader title="My account" />
      <AccountSettings account={account} hasPassword={security.hasPassword} />
    </PageBody>
  )
}
