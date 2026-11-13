import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { JSX } from "react"

import { getMember, listCustomRoles } from "@akoso/core/identity"
import { NotFoundError } from "@akoso/core/kernel"

import { MemberPanel } from "@/features/staff/settings/member-panel"
import { SettingsShell } from "@/features/staff/settings/settings-shell"
import { can, identityFor, requirePermission } from "@/server/session"
import { settingsPagesFor } from "@/server/settings"

// One person's access to the school (sign-in part B, sections 1, 5 and 6).
export const metadata: Metadata = { title: "Access" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string; member: string }> }

export default async function MemberPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school, member: membershipId } = await params
  const ctx = await requirePermission(school, "identity.member.read")
  if (!/^[0-9a-f-]{36}$/.test(membershipId)) notFound()
  const member = await getMember(ctx, membershipId).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound()
    throw error
  })
  const [roles, identity] = await Promise.all([
    listCustomRoles(ctx),
    identityFor(ctx),
  ])
  const isSelf = ctx.actor.kind === "user" && ctx.actor.userId === member.userId

  return (
    <SettingsShell
      schoolName={ctx.school?.name ?? ""}
      title={member.name}
      nav={{ school, current: "team", show: settingsPagesFor(ctx) }}
    >
      <MemberPanel
        school={school}
        member={member}
        customRoles={roles
          .filter(
            (role) =>
              !role.archived ||
              member.customRoles.some((held) => held.id === role.id)
          )
          .map((role) => ({
            id: role.id,
            name: role.name,
            archived: role.archived,
          }))}
        identity={identity}
        isSelf={isSelf}
        may={{
          manage: can(ctx, "identity.member.manage"),
          changeNumber: can(ctx, "identity.contact.change"),
          resetMfa: can(ctx, "identity.mfa.reset"),
          proprietor:
            ctx.actor.kind === "user" && ctx.actor.roles.includes("proprietor"),
        }}
      />
    </SettingsShell>
  )
}
