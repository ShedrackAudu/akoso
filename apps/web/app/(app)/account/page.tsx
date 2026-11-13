import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { getMyAccount, getSecurityStatus } from "@akoso/core/identity"

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
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-bold">My account</h1>
      <AccountSettings account={account} hasPassword={security.hasPassword} />
      <Link
        href="/account/security"
        className="text-base font-medium text-primary underline"
      >
        Sign-in and security
      </Link>
      <Link href="/schools" className="text-base text-primary underline">
        Back to my schools
      </Link>
    </main>
  )
}
