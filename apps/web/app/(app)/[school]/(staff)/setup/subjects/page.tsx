import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolSetup } from "@akoso/core/school-setup"

import { SetupShell } from "@/features/staff/setup/setup-shell"
import { SubjectsEditor } from "@/features/staff/setup/subjects-editor"
import { requirePermission } from "@/server/session"

// Setup step 5: subjects (school setup part A spec, section 6).
export const metadata: Metadata = { title: "Subjects" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function SubjectsPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  return (
    <SetupShell
      school={school}
      current="subjects"
      title="Subjects"
      description="Your school's subjects, and which ones each arm takes."
    >
      <SubjectsEditor
        school={school}
        subjects={setup.subjects}
        classes={setup.classes}
      />
    </SetupShell>
  )
}
