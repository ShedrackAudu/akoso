import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { listMembers } from "@akoso/core/identity"
import { time } from "@akoso/domain"
import { MEMBER_FILTERS } from "@akoso/schemas/identity"

import { describeRoles } from "@/features/shared/auth/role-names"
import { SettingsShell } from "@/features/staff/settings/settings-shell"
import { requirePermission } from "@/server/session"
import { settingsPagesFor } from "@/server/settings"

// People with access (sign-in part B, section 1): everyone with a membership here.
export const metadata: Metadata = { title: "People with access" }
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ school: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const FILTER_LABELS = { staff: "Staff", guardians: "Parents", all: "Everyone" }
const one = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : ""

export default async function TeamPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const query = await searchParams
  const ctx = await requirePermission(school, "identity.member.read")
  const filter =
    MEMBER_FILTERS.find((candidate) => candidate === one(query.filter)) ??
    "staff"
  const search = one(query.search).slice(0, 100)
  const cursor = one(query.cursor)
  const page = await listMembers(ctx, {
    school,
    filter,
    search,
    cursor: cursor === "" ? undefined : cursor,
  })
  const timeZone = ctx.school?.timeZone ?? "Africa/Lagos"
  const base = `/${encodeURIComponent(school)}/settings/team`

  return (
    <SettingsShell
      schoolName={ctx.school?.name ?? ""}
      title="People with access"
      nav={{ school, current: "team", show: settingsPagesFor(ctx) }}
    >
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-base">
          Show
          <select
            name="filter"
            defaultValue={filter}
            className="h-11 rounded-md border border-border bg-background px-3 text-base"
          >
            {MEMBER_FILTERS.map((value) => (
              <option key={value} value={value}>
                {FILTER_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-base">
          Name
          <input
            name="search"
            defaultValue={search}
            className="h-11 rounded-md border border-border bg-background px-3 text-base"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-base text-primary-foreground"
        >
          Find
        </button>
      </form>

      {page.data.length === 0 ? (
        <p className="text-base text-muted-foreground">Nobody matches.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {page.data.map((member) => (
            <li key={member.membershipId}>
              <Link
                href={`${base}/${member.membershipId}`}
                className="flex flex-col gap-1 p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                data-testid="member-row"
              >
                <span className="flex flex-col">
                  <span className="text-base font-semibold">{member.name}</span>
                  <span className="text-base text-muted-foreground">
                    {[
                      describeRoles(member.roles),
                      ...member.customRoles.map((role) => role.name),
                    ]
                      .filter((part) => part !== "")
                      .join(", ")}
                  </span>
                </span>
                <span className="flex flex-col text-base text-muted-foreground sm:items-end">
                  {member.status === "suspended" && (
                    <span className="font-semibold text-destructive">
                      Suspended
                    </span>
                  )}
                  {member.isStaff && (
                    <span>Second step {member.mfaEnabled ? "on" : "off"}</span>
                  )}
                  <span>
                    {member.lastSignInAt === null
                      ? "Never signed in"
                      : `Last sign-in ${time.formatDateTime(new Date(member.lastSignInAt), timeZone)}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {page.nextCursor !== null && (
        <Link
          href={`${base}?${new URLSearchParams({ filter, search, cursor: page.nextCursor }).toString()}`}
          className="text-base text-primary underline"
        >
          Next page
        </Link>
      )}
    </SettingsShell>
  )
}
