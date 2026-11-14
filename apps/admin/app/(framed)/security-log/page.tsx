import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { readTeamSecurityLog } from "@akoso/core/team"
import { time } from "@akoso/domain"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { requireTeam } from "@/server/team"

// The team security log, for the Owner (sign-in part B, section 8).
export const metadata: Metadata = { title: "Team security log" }
export const dynamic = "force-dynamic"

const KIND_LABELS: Record<string, string> = {
  sign_in: "Signed in",
  enrolled: "Joined and created a passkey",
  passkey_added: "Added a passkey",
  passkey_removed: "Removed a passkey",
  recovery_code_used: "Used a recovery code",
  recovery_codes_created: "Made new recovery codes",
  roles_changed: "Roles changed",
  access_removed: "Access removed",
  sessions_revoked: "Signed out everywhere",
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TeamSecurityLogPage({
  searchParams,
}: Props): Promise<JSX.Element> {
  const ctx = await requireTeam("team.security_log.read")
  const cursor = (await searchParams).cursor
  const page = await readTeamSecurityLog(ctx, {
    cursor: typeof cursor === "string" ? cursor : undefined,
  })
  return (
    <PageBody>
      <PageHeader title="Team security log" />
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {page.data.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between"
            data-testid="team-log-entry"
          >
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{entry.name}</span>
              <span className="text-sm">
                {KIND_LABELS[entry.kind] ?? entry.kind}
              </span>
            </span>
            <span className="flex flex-col text-sm text-muted-foreground sm:items-end">
              <span>
                {time.formatDateTime(new Date(entry.at), "Africa/Lagos")}
              </span>
              {entry.ipAddress !== null && <span>{entry.ipAddress}</span>}
            </span>
          </li>
        ))}
      </ul>
      {page.nextCursor !== null && (
        <Link
          href={`/security-log?cursor=${encodeURIComponent(page.nextCursor)}`}
          className="text-sm text-foreground underline underline-offset-4"
        >
          Older
        </Link>
      )}
    </PageBody>
  )
}
