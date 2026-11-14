import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolSetup } from "@akoso/core/school-setup"

import { ProfileForm } from "@/features/staff/setup/profile-form"
import { SetupShell } from "@/features/staff/setup/setup-shell"
import { requirePermission } from "@/server/session"

// Setup step 1: the school profile (school setup part A spec, section 2).
export const metadata: Metadata = { title: "School profile" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function ProfilePage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  return (
    <SetupShell
      school={school}
      current="profile"
      title="School profile"
      description="How your school appears to staff and parents. The logo comes later."
    >
      <ProfileForm school={school} profile={setup.profile} />
    </SetupShell>
  )
}
