import { notFound, redirect } from "next/navigation"
import type { JSX, ReactNode } from "react"

import { getFrame } from "@akoso/core/identity"

import { StaffFrame } from "@/features/shared/frame/staff-frame"
import { frameFor } from "@/server/frame"
import { requireSignedIn } from "@/server/session"

// The staff experience's frame (app frame spec, section 2), around every staff page of
// a school. A parent-only person is sent to the parent experience instead.
type Props = { params: Promise<{ school: string }>; children: ReactNode }

export const dynamic = "force-dynamic"

export default async function StaffLayout({
  params,
  children,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requireSignedIn(school)
  const info = await getFrame(ctx)
  if (!info.isStaffHere) {
    if (info.isGuardianHere) redirect(`/${encodeURIComponent(school)}/parent`)
    notFound()
  }
  const setup = await frameFor(ctx, "staff", info)
  return <StaffFrame setup={setup}>{children}</StaffFrame>
}
