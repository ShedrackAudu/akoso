import type { Metadata } from "next"
import type { JSX } from "react"

import { Enrol } from "@/features/team/enrol"

export const metadata: Metadata = { title: "Join the Akoso team" }
export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EnrolPage({
  searchParams,
}: Props): Promise<JSX.Element> {
  const token = (await searchParams).token
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="font-heading text-2xl font-bold">Join Akoso Admin</h1>
      {typeof token === "string" && token !== "" ? (
        <Enrol token={token} />
      ) : (
        <p className="text-base">
          This link is incomplete. Ask the Owner for a new one.
        </p>
      )}
    </main>
  )
}
