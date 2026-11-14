import type { Metadata } from "next"
import type { JSX } from "react"

import { accessReview, readSecurityLog } from "@akoso/core/identity"
import { time } from "@akoso/domain"

import { SecurityLogView } from "@/features/staff/settings/security-log-view"
import { SettingsShell } from "@/features/staff/settings/settings-shell"
import { can, requirePermission } from "@/server/session"
import { settingsPagesFor } from "@/server/settings"

// The proprietor's security log and access review (sign-in part B, section 3).
export const metadata: Metadata = { title: "Security log" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function SecurityLogPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "identity.security_log.read")
  const timeZone = ctx.school?.timeZone ?? "Africa/Lagos"
  const [log, review] = await Promise.all([
    readSecurityLog(ctx, { school, failuresOnly: false }),
    can(ctx, "identity.access_review.read") ? accessReview(ctx) : null,
  ])
  const base = `/${encodeURIComponent(school)}/settings/security`

  return (
    <SettingsShell
      title="Security log"
      nav={{ school, current: "security", show: settingsPagesFor(ctx) }}
    >
      <SecurityLogView school={school} timeZone={timeZone} first={log} />

      {review !== null && (
        <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Access review</h2>
            <a
              href={`${base}/access-review`}
              className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium"
              download
            >
              Download CSV
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Everyone with a role that reaches money, health or the school's
            settings. Check it every term, and remove access nobody needs.
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {review.map((row) => (
              <li
                key={row.userId}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between"
                data-testid="access-review-row"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{row.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {row.roles.join(", ")}
                  </span>
                </span>
                <span className="flex flex-col text-sm text-muted-foreground sm:items-end">
                  {row.status === "suspended" && <span>Suspended</span>}
                  <span>Second step {row.mfaEnabled ? "on" : "off"}</span>
                  <span>
                    {row.lastSignInAt === null
                      ? "Never signed in"
                      : `Last sign-in ${time.formatDateTime(new Date(row.lastSignInAt), timeZone)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SettingsShell>
  )
}
