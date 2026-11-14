import type { Metadata } from "next"
import type { JSX } from "react"

import { getMyTeamSecurity } from "@akoso/core/team"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

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
    <PageBody width="narrow">
      <PageHeader title="My passkeys and recovery codes" />
      <MySecurity security={security} recovered={recovered} />
    </PageBody>
  )
}
