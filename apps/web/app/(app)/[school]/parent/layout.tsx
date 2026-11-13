import { notFound } from "next/navigation"
import type { JSX, ReactNode } from "react"

import { getFrame } from "@akoso/core/identity"

import { LightFrame } from "@/features/shared/frame/light-frame"
import { frameFor } from "@/server/frame"
import { requireSignedIn } from "@/server/session"

// The parent experience's frame (app frame spec, section 3): phone-first and light.
// Only for parents and guardians in this school; parent pages import nothing from
// features/staff.
type Props = { params: Promise<{ school: string }>; children: ReactNode }

export const dynamic = "force-dynamic"

export default async function ParentLayout({
  params,
  children,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requireSignedIn(school)
  const info = await getFrame(ctx)
  if (!info.isGuardianHere) notFound()
  const setup = await frameFor(ctx, "parent", info)
  return <LightFrame setup={setup}>{children}</LightFrame>
}
