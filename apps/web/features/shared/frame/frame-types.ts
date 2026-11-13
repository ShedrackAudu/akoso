// What a school app frame is given (app frame spec). Kept apart from the frames
// themselves, so importing the type never pulls a frame's code into a page.
import type { FrameNavItem } from "@akoso/ui/akoso/app-frame"

interface FrameSchool {
  slug: string
  name: string
}

export interface FrameSetup {
  experience: "staff" | "parent" | "account"
  /** This school, or null on pages across schools. */
  school: FrameSchool | null
  /** Every school the person may use. */
  schools: FrameSchool[]
  /** Where the school's identity leads: its staff home or its parent home. */
  homeHref: string
  name: string
  /** "Proprietor", "Parent", and so on, in this school; empty across schools. */
  roleLabel: string
  /** The other view, when the person is both staff and parent here. */
  switchTo: { view: "staff" | "parent"; school: string } | null
  nav: FrameNavItem[]
  moreItems: FrameNavItem[]
}
