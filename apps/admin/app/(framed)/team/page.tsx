import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { listTeamMembers } from "@akoso/core/team"
import { time } from "@akoso/domain"
import { TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { InviteForm } from "@/features/team/invite-form"
import { requireTeam } from "@/server/team"

// The Akoso team, for the Owner (sign-in part B, section 8).
export const metadata: Metadata = { title: "The team" }
export const dynamic = "force-dynamic"

export default async function TeamPage(): Promise<JSX.Element> {
  const ctx = await requireTeam("team.member.read")
  const members = await listTeamMembers(ctx)
  const canManage = ctx.member.permissions.has("team.member.manage")
  return (
    <PageBody>
      <PageHeader title="The team" />
      <div className="flex flex-col gap-6">
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {members.map((member) => (
            <li key={member.userId}>
              <Link
                href={`/team/${member.userId}`}
                className="flex flex-col gap-1 p-4 hover:bg-muted sm:flex-row sm:justify-between"
                data-testid="team-member-row"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{member.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                <span className="flex flex-col text-sm text-muted-foreground sm:items-end">
                  <span>
                    {member.removed
                      ? "Access removed"
                      : member.roles
                          .map((role) => TEAM_ROLE_LABELS[role])
                          .join(", ")}
                  </span>
                  {!member.removed && (
                    <span>
                      {member.enrolled
                        ? `${String(member.passkeys)} passkey${member.passkeys === 1 ? "" : "s"}`
                        : "Invited, not joined yet"}
                    </span>
                  )}
                  <span>
                    {member.lastSignInAt === null
                      ? "Never signed in"
                      : `Last sign-in ${time.formatDateTime(new Date(member.lastSignInAt), "Africa/Lagos")}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {canManage && <InviteForm />}
      </div>
    </PageBody>
  )
}
