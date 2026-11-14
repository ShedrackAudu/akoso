import Link from "next/link"
import type { JSX, ReactNode } from "react"

import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

// Every Setup page (school setup part A spec, section 1): its title, the steps as tabs,
// and the step itself.
const SETUP_PAGES = [
  { key: "profile", label: "School profile" },
  { key: "session", label: "Session and terms" },
  { key: "calendar", label: "Calendar" },
  { key: "classes", label: "Classes and arms" },
  { key: "subjects", label: "Subjects" },
] as const

export type SetupPage = (typeof SETUP_PAGES)[number]["key"]

export const setupHref = (school: string, page?: SetupPage): string =>
  `/${encodeURIComponent(school)}/setup${page === undefined ? "" : `/${page}`}`

export function SetupShell({
  school,
  current,
  title,
  description,
  children,
}: {
  school: string
  current: SetupPage
  title: string
  description?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <PageBody>
      <PageHeader
        title={title}
        description={description}
        above={
          <Link
            href={setupHref(school)}
            className="text-sm underline underline-offset-4"
          >
            All setup steps
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <nav aria-label="Setup steps" className="flex flex-wrap gap-2">
          {SETUP_PAGES.map((page) => (
            <Link
              key={page.key}
              href={setupHref(school, page.key)}
              aria-current={page.key === current ? "page" : undefined}
              className="inline-flex min-h-8 items-center rounded-md border border-border px-3 text-sm aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
            >
              {page.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </PageBody>
  )
}
