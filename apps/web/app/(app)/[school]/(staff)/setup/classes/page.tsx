import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolSetup } from "@akoso/core/school-setup"

import { ClassesEditor } from "@/features/staff/setup/classes-editor"
import { SetupShell, setupHref } from "@/features/staff/setup/setup-shell"
import { requirePermission } from "@/server/session"

// Setup step 4: classes and arms (school setup part A spec, section 5).
export const metadata: Metadata = { title: "Classes and arms" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function ClassesPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  return (
    <SetupShell
      school={school}
      current="classes"
      title="Classes and arms"
      description="Your classes, in order, and the arms of each. Each arm follows its own curriculum."
    >
      <ClassesEditor
        school={school}
        classes={setup.classes}
        hasSchoolTypes={setup.profile.schoolTypes.length > 0}
        profileHref={setupHref(school, "profile")}
      />
    </SetupShell>
  )
}
