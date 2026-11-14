import type { Metadata } from "next"
import type { JSX } from "react"

import { recentRecoveryUses } from "@akoso/core/team"
import { time } from "@akoso/domain"
import { TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"
import { EmptyState, PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { requireTeam } from "@/server/team"

// The admin home (sign-in part B, section 8). Each later feature adds its links here.
export const metadata: Metadata = { title: "Home" }
export const dynamic = "force-dynamic"

const LAGOS = "Africa/Lagos"

export default async function HomePage(): Promise<JSX.Element> {
  const ctx = await requireTeam()
  const { member } = ctx
  const canSeeLog = member.permissions.has("team.security_log.read")
  const recoveries = canSeeLog ? await recentRecoveryUses(ctx) : []

  return (
    <PageBody>
      <PageHeader
        title={`Welcome, ${member.name.split(/\s+/)[0] ?? ""}`}
        description={
          <span data-testid="signed-in-as">
            {member.name} ·{" "}
            {member.roles.length === 0
              ? "No role yet"
              : member.roles.map((role) => TEAM_ROLE_LABELS[role]).join(", ")}
          </span>
        }
      />
      {recoveries.length > 0 ? (
        <section
          role="status"
          className="rounded-lg border border-border bg-muted p-4 text-sm"
          data-testid="recovery-alert"
        >
          <p className="font-semibold">
            Recovery codes used in the last 30 days
          </p>
          <ul>
            {recoveries.map((use) => (
              <li key={`${use.name}-${use.at}`}>
                {use.name}, {time.formatDateTime(new Date(use.at), LAGOS)}
              </li>
            ))}
          </ul>
          <p>If that wasn&apos;t them, remove their access at once.</p>
        </section>
      ) : (
        <EmptyState>
          The Akoso team&apos;s tools will appear here as they are built.
        </EmptyState>
      )}
    </PageBody>
  )
}
