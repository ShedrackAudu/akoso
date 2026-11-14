import type { JSX, ReactNode } from "react"

import { LightFrame } from "@/features/shared/frame/light-frame"
import { frameFor } from "@/server/frame"
import { requireSignedIn } from "@/server/session"

// The frame for pages about the person, across schools (app frame spec, section 6): my
// account, sign-in and security, the school picker. A top bar only. It also frames the
// security page while a required second step is being set up, so the layout lets that
// through; each page still checks its own access.
export const dynamic = "force-dynamic"

export default async function PersonalLayout({
  children,
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const ctx = await requireSignedIn(null, { allowWithoutMfa: true })
  const setup = await frameFor(ctx, "account")
  return <LightFrame setup={setup}>{children}</LightFrame>
}
