import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { JSX } from "react"

import { BRAND_LINES } from "@akoso/core/config"
import { getFrame } from "@akoso/core/identity"
import { EmptyState, PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { staffNav } from "@/features/shared/navigation"
import { chosenView } from "@/server/frame"
import { requireSignedIn } from "@/server/session"

// The staff home (app frame spec, section 7), until Stage 2's setup and the Insight
// dashboards arrive: a short welcome, and a card for each page this person may open.
type Props = { params: Promise<{ school: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await requireSignedIn((await params).school)
  return { title: ctx.school?.name ?? "School" }
}

const DESCRIPTIONS: Record<string, string> = {
  setup: "Your school's profile, terms, calendar, classes and subjects.",
  team: "Who can use the school's account, and with which roles.",
  roles: "Your school's own roles, and which roles use a second sign-in step.",
  security: "Sign-ins, failures and changes to people's access.",
}

export default async function SchoolHomePage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requireSignedIn(school)
  const frame = await getFrame(ctx)
  // Someone who is also a parent here, and chose the parent view on this device.
  if (frame.isGuardianHere && (await chosenView()) === "parent") {
    redirect(`/${encodeURIComponent(school)}/parent`)
  }
  const pages = staffNav(school, frame.permissions).flatMap(
    (item) => item.children ?? (item.key === "home" ? [] : [item])
  )

  return (
    <PageBody>
      <PageHeader
        title={ctx.school?.name ?? "Your school"}
        description={BRAND_LINES.proprietor}
      />
      {pages.length === 0 ? (
        <EmptyState>
          Your classes and today&apos;s tasks will appear here as your school
          sets them up.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <li key={page.key}>
              <Link
                href={page.href}
                className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="home-card"
              >
                <span className="text-sm font-semibold">{page.label}</span>
                <span className="text-sm text-muted-foreground">
                  {DESCRIPTIONS[page.key] ?? ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  )
}
