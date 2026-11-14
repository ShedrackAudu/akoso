// What a page's frame shows (app frame spec): the person, their schools, the
// navigation for their permissions here, and the other view when they are both staff
// and parent in this school.
import { cookies } from "next/headers"

import { getFrame, type FrameInfo } from "@akoso/core/identity"
import type { RequestContext } from "@akoso/core/kernel"
import { isRoleKey } from "@akoso/schemas/permissions"

import { describeRoles } from "@/features/shared/auth/role-names"
import type { FrameSetup } from "@/features/shared/frame/frame-types"
import {
  ACCOUNT_ITEMS,
  parentNav,
  staffNav,
} from "@/features/shared/navigation"

import { VIEW_COOKIE } from "./view-cookie"

/** The frame for a school page in one experience, or for pages across schools. */
export async function frameFor(
  ctx: RequestContext,
  experience: FrameSetup["experience"],
  info?: FrameInfo
): Promise<FrameSetup> {
  const frame = info ?? (await getFrame(ctx))
  const slug = frame.school?.slug ?? ""
  const base = `/${encodeURIComponent(slug)}`
  const roles =
    ctx.actor.kind === "user" ? ctx.actor.roles.filter(isRoleKey) : []
  const both = frame.isStaffHere && frame.isGuardianHere
  const nav =
    experience === "staff"
      ? staffNav(slug, frame.permissions)
      : experience === "parent"
        ? parentNav(slug)
        : [
            {
              key: "schools",
              label: "My schools",
              href: "/schools",
              icon: "home" as const,
              exact: true,
            },
          ]
  return {
    experience,
    school: experience === "account" ? null : frame.school,
    schools: frame.schools,
    homeHref: experience === "parent" ? `${base}/parent` : base,
    name: frame.name,
    roleLabel:
      experience === "account"
        ? ""
        : experience === "parent"
          ? "Parent"
          : describeRoles(roles.filter((role) => role !== "guardian")),
    switchTo:
      both && experience !== "account"
        ? { view: experience === "staff" ? "parent" : "staff", school: slug }
        : null,
    nav,
    moreItems: [
      ...ACCOUNT_ITEMS,
      ...(frame.schools.length > 1 && experience !== "account"
        ? [
            {
              key: "switch-school",
              label: "Switch school",
              href: "/schools",
              icon: "home" as const,
              exact: true,
            },
          ]
        : []),
    ],
  }
}

/** The view this device chose last, if any. */
export async function chosenView(): Promise<"staff" | "parent" | null> {
  const value = (await cookies()).get(VIEW_COOKIE)?.value
  return value === "staff" || value === "parent" ? value : null
}
