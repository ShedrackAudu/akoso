import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolSetup } from "@akoso/core/school-setup"

import { CalendarEditor } from "@/features/staff/setup/calendar-editor"
import { SetupShell } from "@/features/staff/setup/setup-shell"
import { requirePermission } from "@/server/session"

// Setup step 3: the school calendar (school setup part A spec, section 4).
export const metadata: Metadata = { title: "Calendar" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function CalendarPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  return (
    <SetupShell
      school={school}
      current="calendar"
      title="Calendar"
      description="Holidays and other days the school is closed. Attendance and reminders use them."
    >
      <CalendarEditor
        school={school}
        current={setup.current}
        nonSchoolDays={setup.nonSchoolDays}
        suggested={setup.suggestedHolidays}
      />
    </SetupShell>
  )
}
