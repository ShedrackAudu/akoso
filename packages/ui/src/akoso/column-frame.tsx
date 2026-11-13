"use client"

// The column frame (app frame spec, section 3): parents, and pages about the person
// across schools. A top bar and a bottom bar at every size, the content in a centred
// column, and nothing else: no sidebar, no menus, so a parent's phone downloads as
// little as possible (brief 18's budget).
import type { JSX, ReactNode } from "react"

import {
  BottomBar,
  SkipLink,
  type FrameIcons,
  type FrameLink,
  type FrameNavItem,
} from "./frame-parts"

export type { FrameIcons, FrameLink, FrameNavItem } from "./frame-parts"

export interface ColumnFrameProps {
  pathname: string
  link: FrameLink
  /** Only the icons this navigation uses. */
  icons: FrameIcons
  /** The left of the top bar: the school. */
  brand: ReactNode
  /** The right of the top bar: a link to my account. */
  account: ReactNode
  /** Up to 4 items for the bottom bar. */
  nav: FrameNavItem[]
  /** Extra items in the More sheet. */
  moreItems?: FrameNavItem[]
  /** The bottom of the More sheet, such as Sign out. */
  moreFooter?: ReactNode
  notice?: ReactNode
  children: ReactNode
}

export function ColumnFrame({
  pathname,
  link,
  icons,
  brand,
  account,
  nav,
  moreItems = [],
  moreFooter,
  notice,
  children,
}: ColumnFrameProps): JSX.Element {
  return (
    <>
      <SkipLink />
      <div className="flex min-h-svh flex-col">
        <header
          className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-6"
          data-testid="top-bar"
        >
          <div className="min-w-0 flex-1">{brand}</div>
          <div className="shrink-0">{account}</div>
        </header>
        {notice}
        <main id="main" tabIndex={-1} className="flex-1 pb-20 outline-none">
          {children}
        </main>
      </div>
      <BottomBar
        items={nav}
        moreItems={[...nav, ...moreItems]}
        moreFooter={moreFooter}
        icons={icons}
        pathname={pathname}
        link={link}
      />
    </>
  )
}
