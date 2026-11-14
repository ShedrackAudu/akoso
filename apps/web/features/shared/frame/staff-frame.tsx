"use client"

// The staff experience's frame (app frame spec, section 2): the shared AppFrame with a
// sidebar on computers, the school switcher and the full account menu.
import {
  GearIcon,
  HouseIcon,
  KeyIcon,
  ListMagnifyingGlassIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { JSX, ReactNode } from "react"

import {
  AppFrame,
  type FrameIcons,
  type FrameLink,
} from "@akoso/ui/akoso/app-frame"

import { AccountMenu } from "./account-menu"
import type { FrameSetup } from "./frame-types"
import { SchoolBrand } from "./school-brand"

const FrameLinkComponent: FrameLink = (props) => <Link {...props} />

/** The icons the staff navigation uses (features/shared/navigation.ts). */
const STAFF_ICONS: FrameIcons = {
  home: HouseIcon,
  people: UsersThreeIcon,
  settings: GearIcon,
  roles: KeyIcon,
  log: ListMagnifyingGlassIcon,
  account: UserCircleIcon,
  security: ShieldCheckIcon,
}

export function StaffFrame({
  setup,
  notice,
  children,
}: {
  setup: FrameSetup
  notice?: ReactNode
  children: ReactNode
}): JSX.Element {
  const pathname = usePathname()
  return (
    <AppFrame
      pathname={pathname}
      link={FrameLinkComponent}
      icons={STAFF_ICONS}
      brand={
        <SchoolBrand
          school={setup.school}
          schools={setup.schools}
          homePath=""
        />
      }
      account={
        <AccountMenu
          name={setup.name}
          roleLabel={setup.roleLabel}
          switchTo={setup.switchTo}
        />
      }
      nav={setup.nav}
      bottomNav={setup.nav.slice(0, 4)}
      moreItems={setup.moreItems}
      sidebarFooter={
        <p className="px-3 text-sm text-muted-foreground">Akoso</p>
      }
      notice={notice}
    >
      {children}
    </AppFrame>
  )
}
