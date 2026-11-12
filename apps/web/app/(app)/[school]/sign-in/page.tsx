import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { JSX } from "react"

import { SignInForm } from "@/features/shared/auth/sign-in-form"
import { schoolBySlug } from "@/server/schools"

// Reached from a school's own page ({slug}.{domain}, then Sign in). School first: its
// name leads (docs/brand-voice.md).
type Props = { params: Promise<{ school: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const school = await schoolBySlug((await params).school)
  return { title: school === null ? "Sign in" : `Sign in · ${school.name}` }
}

export default async function SchoolSignInPage({
  params,
}: Props): Promise<JSX.Element> {
  const school = await schoolBySlug((await params).school)
  if (school === null || school.status === "closed") notFound()
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <SignInForm schoolName={school.name} next={`/${school.slug}`} />
    </main>
  )
}
