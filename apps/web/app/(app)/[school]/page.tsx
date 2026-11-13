import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import type { RoleKey } from "@akoso/schemas/permissions"

import { describeRoles } from "@/features/shared/auth/role-names"
import { SignOutButton } from "@/features/shared/auth/sign-out-button"
import { requireSignedIn } from "@/server/session"
import { settingsPagesFor } from "@/server/settings"

// A school's home in the app. A placeholder until the first real screens (Stage 2);
// it proves the school in the address is checked against the person's memberships.
type Props = { params: Promise<{ school: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await requireSignedIn((await params).school)
  return { title: ctx.school?.name ?? "School" }
}

export default async function SchoolHomePage({
  params,
}: Props): Promise<JSX.Element> {
  const ctx = await requireSignedIn((await params).school)
  const roles = ctx.actor.kind === "user" ? (ctx.actor.roles as RoleKey[]) : []
  const settings = settingsPagesFor(ctx)
  const slug = encodeURIComponent(ctx.school?.slug ?? "")
  const firstSettingsPage = settings.team
    ? "team"
    : settings.roles
      ? "roles"
      : settings.security
        ? "security"
        : null
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 text-center">
        <h1 className="font-heading text-2xl font-bold">{ctx.school?.name}</h1>
        <p
          className="text-base text-muted-foreground"
          data-testid="signed-in-as"
        >
          Signed in as {describeRoles(roles)}
        </p>
        {firstSettingsPage !== null && (
          <Link
            href={`/${slug}/settings/${firstSettingsPage}`}
            className="text-base font-medium text-primary underline"
          >
            School settings
          </Link>
        )}
        <Link
          href="/account"
          className="text-base font-medium text-primary underline"
        >
          My account
        </Link>
        <Link
          href="/account/security"
          className="text-base font-medium text-primary underline"
        >
          Sign-in and security
        </Link>
        <Link href="/schools" className="text-base text-primary underline">
          Switch school
        </Link>
        <SignOutButton />
      </div>
    </main>
  )
}
