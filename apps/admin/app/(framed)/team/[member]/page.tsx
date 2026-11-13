import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { JSX } from "react"

import { NotFoundError } from "@akoso/core/kernel"
import { getTeamMember } from "@akoso/core/team"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { TeamMemberPanel } from "@/features/team/team-member-panel"
import { requireTeam } from "@/server/team"

// One team member: roles, and removing access (sign-in part B, section 8).
export const metadata: Metadata = { title: "Team member" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ member: string }> }

export default async function TeamMemberPage({
  params,
}: Props): Promise<JSX.Element> {
  const { member: userId } = await params
  const ctx = await requireTeam("team.member.read")
  if (!/^[0-9a-f-]{36}$/.test(userId)) notFound()
  const member = await getTeamMember(ctx, userId).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound()
    throw error
  })
  return (
    <PageBody width="narrow">
      <PageHeader
        title={member.name}
        description={member.email}
        above={
          <Link
            href="/team"
            className="text-foreground underline underline-offset-4"
          >
            The team
          </Link>
        }
      />
      <TeamMemberPanel
        member={member}
        isSelf={member.userId === ctx.member.userId}
        canManage={ctx.member.permissions.has("team.member.manage")}
      />
    </PageBody>
  )
}
