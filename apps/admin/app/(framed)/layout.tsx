import type { JSX, ReactNode } from "react"

import type { FrameNavItem } from "@akoso/ui/akoso/app-frame"
import { TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"

import { AdminFrame } from "@/features/team/admin-frame"
import { requireTeam } from "@/server/team"

// The admin frame around every signed-in admin page (app frame spec, section 4).
// Sign-in, enrolment and recovery stay outside it. Each item shows only with its
// permission; every page checks again on the server.
export const dynamic = "force-dynamic"

export default async function FramedLayout({
  children,
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const ctx = await requireTeam()
  const can = (action: string) =>
    ctx.member.permissions.has(action as `${string}.${string}.${string}`)
  const nav: FrameNavItem[] = [
    { key: "home", label: "Home", href: "/", icon: "home", exact: true },
    ...(can("team.member.read")
      ? [
          {
            key: "team",
            label: "The team",
            href: "/team",
            icon: "people" as const,
          },
        ]
      : []),
    ...(can("team.security_log.read")
      ? [
          {
            key: "log",
            label: "Team security log",
            href: "/security-log",
            icon: "log" as const,
          },
        ]
      : []),
    {
      key: "security",
      label: "My passkeys",
      href: "/security",
      icon: "passkey",
    },
  ]
  return (
    <AdminFrame
      name={ctx.member.name}
      roleLabel={
        ctx.member.roles.length === 0
          ? "No role yet"
          : ctx.member.roles.map((role) => TEAM_ROLE_LABELS[role]).join(", ")
      }
      nav={nav}
    >
      {children}
    </AdminFrame>
  )
}
