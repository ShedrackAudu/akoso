import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { JSX } from "react"

import { NotFoundError } from "@akoso/core/kernel"
import { getTeamMember } from "@akoso/core/team"

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
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <Link href="/team" className="text-base text-primary underline">
        The team
      </Link>
      <h1 className="font-heading text-2xl font-bold">{member.name}</h1>
      <p className="text-base text-muted-foreground">{member.email}</p>
      <TeamMemberPanel
        member={member}
        isSelf={member.userId === ctx.member.userId}
        canManage={ctx.member.permissions.has("team.member.manage")}
      />
    </main>
  )
}
