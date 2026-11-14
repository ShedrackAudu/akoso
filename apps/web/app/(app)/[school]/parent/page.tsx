import type { Metadata } from "next"
import type { JSX } from "react"

import { getFrame } from "@akoso/core/identity"
import { time } from "@akoso/domain"
import { EmptyState, PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { requireSignedIn } from "@/server/session"

// The parent home (app frame spec, section 3). Its content arrives in Stages 3 to 5:
// each child's balance and fees account, results, attendance and messages (brief 18).
export const metadata: Metadata = { title: "Home" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

/** "Good morning" and so on, by the hour in the school's time zone. */
function greeting(timeZone: string): string {
  const clock = time.formatDateTime(new Date(), timeZone).split(", ")[1] ?? "12"
  const hour = Number(clock.split(":")[0])
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default async function ParentHomePage({
  params,
}: Props): Promise<JSX.Element> {
  const ctx = await requireSignedIn((await params).school)
  const frame = await getFrame(ctx)
  const firstName = frame.name.split(/\s+/)[0] ?? ""
  return (
    <PageBody width="narrow">
      <PageHeader
        title={`${greeting(ctx.school?.timeZone ?? "Africa/Lagos")}, ${firstName}`}
        description="Your child's school life, in your hand."
      />
      <EmptyState>
        Your children&apos;s fees, results and school news will appear here when{" "}
        {ctx.school?.name ?? "your school"} shares them.
      </EmptyState>
    </PageBody>
  )
}
