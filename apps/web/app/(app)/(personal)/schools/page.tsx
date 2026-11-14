import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { JSX } from "react"

import { listMySchools } from "@akoso/core/identity"
import { Monogram } from "@akoso/ui/akoso/monogram"
import { EmptyState, PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { describeRoles } from "@/features/shared/auth/role-names"
import { requireSignedIn } from "@/server/session"

// The school picker (brief section 6): each school the person may use, with their
// roles there. With one school there is nothing to pick.
export const metadata: Metadata = { title: "Choose a school" }
export const dynamic = "force-dynamic"

export default async function SchoolPickerPage(): Promise<JSX.Element> {
  const ctx = await requireSignedIn(null)
  const { data: schools } = await listMySchools(ctx)
  const only = schools.length === 1 ? schools[0] : undefined
  if (only !== undefined) redirect(`/${only.slug}`)

  return (
    <PageBody width="narrow">
      <PageHeader title="Choose a school" />
      {schools.length === 0 ? (
        <EmptyState>
          Your account is not linked to a school yet. Please contact your school
          office.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {schools.map((school) => (
            <li key={school.id}>
              <Link
                href={`/${school.slug}`}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted"
              >
                <Monogram name={school.name} />
                <span className="flex flex-col">
                  <span className="text-base font-medium">{school.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {describeRoles(school.roles)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  )
}
