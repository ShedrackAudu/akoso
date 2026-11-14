import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { JSX } from "react"

import { loadEnv } from "@akoso/core/config"
import { buttonVariants } from "@akoso/ui/components/button"

import { appUrl, schoolBySlug } from "@/server/schools"

// Served for {slug}.{domain}/ through the request proxy's rewrite; never reachable on
// the app address. School first: the school's name leads, Akoso stays in the background
// (docs/brand-voice.md).
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const school = await schoolBySlug((await params).slug)
  return { title: school?.name ?? "Not found" }
}

export default async function SchoolHome({
  params,
}: Props): Promise<JSX.Element> {
  const school = await schoolBySlug((await params).slug)
  if (school === null || school.status === "closed") notFound()

  if (school.status === "suspended") {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-3 text-center">
          <h1 className="font-heading text-3xl font-bold">{school.name}</h1>
          <p className="text-sm text-muted-foreground">
            This page is temporarily unavailable. Please contact the school
            office.
          </p>
        </div>
      </main>
    )
  }

  const host = (await headers()).get("host") ?? ""
  const signIn = appUrl(
    `/${school.slug}/sign-in`,
    host,
    loadEnv(process.env).APP_BASE_DOMAIN
  )
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="font-heading text-3xl font-bold">{school.name}</h1>
        <p className="text-sm text-muted-foreground">
          Parents and staff: sign in to see results, fees and school updates.
        </p>
        <a
          href={signIn}
          className={buttonVariants({
            size: "lg",
            className: "px-4",
          })}
        >
          Sign in
        </a>
        <p className="text-sm text-muted-foreground">Powered by Akoso</p>
      </div>
    </main>
  )
}
