import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { recentRecoveryUses } from "@akoso/core/team"
import { time } from "@akoso/domain"
import { TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"

import { SignOutButton } from "@/features/team/sign-out-button"
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
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">Akoso Admin</h1>
        <p
          className="text-base text-muted-foreground"
          data-testid="signed-in-as"
        >
          {member.name} ·{" "}
          {member.roles.length === 0
            ? "No role yet"
            : member.roles.map((role) => TEAM_ROLE_LABELS[role]).join(", ")}
        </p>
      </div>

      {recoveries.length > 0 && (
        <section
          role="status"
          className="rounded-lg border border-border bg-muted p-4 text-base"
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
      )}

      <nav aria-label="Admin" className="flex flex-col gap-3">
        {member.permissions.has("team.member.read") && (
          <Link
            href="/team"
            className="text-base font-medium text-primary underline"
          >
            The team
          </Link>
        )}
        {canSeeLog && (
          <Link
            href="/security-log"
            className="text-base font-medium text-primary underline"
          >
            Team security log
          </Link>
        )}
        <Link
          href="/security"
          className="text-base font-medium text-primary underline"
        >
          My passkeys and recovery codes
        </Link>
      </nav>
      <SignOutButton />
    </main>
  )
}
