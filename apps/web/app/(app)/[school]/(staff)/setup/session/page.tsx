import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolSetup } from "@akoso/core/school-setup"

import { SessionEditor } from "@/features/staff/setup/session-editor"
import { SetupShell } from "@/features/staff/setup/setup-shell"
import { requirePermission } from "@/server/session"

// Setup step 2: the session and its terms (school setup part A spec, section 3).
export const metadata: Metadata = { title: "Session and terms" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function SessionPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  return (
    <SetupShell
      school={school}
      current="session"
      title="Session and terms"
      description="Your own dates for this session's three terms. Nothing is filled in for you."
    >
      <SessionEditor
        school={school}
        sessions={setup.sessions}
        today={setup.today}
      />
    </SetupShell>
  )
}
