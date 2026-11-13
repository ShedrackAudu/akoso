import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { getMyTeamSecurity } from "@akoso/core/team"

import { MySecurity } from "@/features/team/my-security"
import { requireTeam } from "@/server/team"

// My passkeys and recovery codes (sign-in part B, section 8).
export const metadata: Metadata = { title: "My passkeys" }
export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SecurityPage({
  searchParams,
}: Props): Promise<JSX.Element> {
  const ctx = await requireTeam()
  const security = await getMyTeamSecurity(ctx)
  const recovered = (await searchParams).recovered === "1"
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Link href="/" className="text-base text-primary underline">
        Akoso Admin
      </Link>
      <h1 className="font-heading text-2xl font-bold">
        My passkeys and recovery codes
      </h1>
      <MySecurity security={security} recovered={recovered} />
    </main>
  )
}
