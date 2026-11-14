"use client"

// The light frame (app frame spec, section 3): for parents, and for the pages about the
// person across schools. Parents' phones are cheap and their data costly (brief 18), so
// it loads no menu library: the initials lead to My account, and everything else
// (switching school or view, signing out) is in More, the browser's own dialog.
import {
  HouseIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { JSX, ReactNode } from "react"

import {
  ColumnFrame,
  type FrameIcons,
  type FrameLink,
} from "@akoso/ui/akoso/column-frame"
import { Monogram } from "@akoso/ui/akoso/monogram"

import { switchViewAction } from "@/server/actions/view"

import { authPost } from "../auth/auth-client"
import type { FrameSetup } from "./frame-types"

const FrameLinkComponent: FrameLink = (props) => <Link {...props} />

/** Only the icons the parent and personal navigation use: little to download. */
const LIGHT_ICONS: FrameIcons = {
  home: HouseIcon,
  account: UserCircleIcon,
  security: ShieldCheckIcon,
}

const ITEM =
  "flex min-h-8 w-full items-center rounded-md px-3 text-left text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"

export function LightFrame({
  setup,
  notice,
  children,
}: {
  setup: FrameSetup
  notice?: ReactNode
  children: ReactNode
}): JSX.Element {
  const pathname = usePathname()
  const router = useRouter()
  const brand =
    setup.school === null ? (
      <Link
        href="/schools"
        className="font-heading text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Akoso
      </Link>
    ) : (
      <Link
        href={setup.homeHref}
        className="flex min-h-8 min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="school-brand"
      >
        <Monogram name={setup.school.name} />
        <span
          className="truncate text-sm font-semibold"
          title={setup.school.name}
        >
          {setup.school.name}
        </span>
      </Link>
    )
  return (
    <ColumnFrame
      pathname={pathname}
      link={FrameLinkComponent}
      icons={LIGHT_ICONS}
      brand={brand}
      account={
        <Link
          href="/account"
          className="flex min-h-8 min-w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="account-link"
        >
          <Monogram name={setup.name} />
          <span className="sr-only">My account: {setup.name}</span>
        </Link>
      }
      nav={setup.nav.slice(0, 4)}
      moreItems={setup.moreItems}
      moreFooter={
        <div className="flex flex-col gap-1">
          {setup.switchTo !== null && (
            <button
              type="button"
              className={ITEM}
              onClick={() => {
                void switchViewAction(setup.switchTo)
              }}
            >
              {setup.switchTo.view === "parent"
                ? "Switch to parent view"
                : "Switch to staff view"}
            </button>
          )}
          <button
            type="button"
            className={ITEM}
            onClick={() => {
              void authPost("/sign-out").then(() => {
                router.push("/sign-in")
                router.refresh()
              })
            }}
          >
            Sign out
          </button>
        </div>
      }
      notice={notice}
    >
      {children}
    </ColumnFrame>
  )
}
