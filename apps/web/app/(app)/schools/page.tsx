import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { JSX } from "react"

import { listMySchools } from "@akoso/core/identity"

import { describeRoles } from "@/features/shared/auth/role-names"
import { SignOutButton } from "@/features/shared/auth/sign-out-button"
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
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="font-heading text-2xl font-bold">Choose a school</h1>
        {schools.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Your account is not linked to a school yet. Please contact your
            school office.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {schools.map((school) => (
              <li key={school.id}>
                <Link
                  href={`/${school.slug}`}
                  className="flex min-h-11 flex-col rounded-lg border p-4 hover:bg-muted"
                >
                  <span className="text-base font-medium">{school.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {describeRoles(school.roles)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <SignOutButton />
      </div>
    </main>
  )
}
