"use client"

// The sidebar frame (spec: docs/specs/stage-2-app-frame.md): the staff experience and
// the admin app. A sidebar on computers, collapsible to icons; on phones a top bar with
// a bottom bar, or a menu button when there is no bottom bar. It only arranges what the
// app gives it: the navigation (already filtered by permission on the server), the
// icons that navigation uses, the brand, the account menu and the page. Parents use the
// lighter ColumnFrame (column-frame.tsx).
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  ListIcon,
} from "@phosphor-icons/react"
import { useSyncExternalStore, type JSX, type ReactNode } from "react"

import { cn } from "cn"

import {
  BottomBar,
  MenuSheet,
  NavList,
  SkipLink,
  type FrameIcons,
  type FrameLink,
  type FrameNavItem,
} from "./frame-parts"
import { Icon } from "./icon"

export type {
  FrameIcons,
  FrameLink,
  FrameNavItem,
  NavIconKey,
} from "./frame-parts"

export interface AppFrameProps {
  /** The current address, for marking the current item. */
  pathname: string
  link: FrameLink
  /** The icons the navigation uses. */
  icons: FrameIcons
  /** The left of the top bar and the top of the sidebar: the school, or Akoso Admin. */
  brand: ReactNode
  /** The right of the top bar: the account menu. */
  account: ReactNode
  /** The full navigation, for the sidebar and the More sheet. */
  nav: FrameNavItem[]
  /** Up to 4 items for the phone's bottom bar; null shows a menu button instead. */
  bottomNav: FrameNavItem[] | null
  /** Extra items only in the More sheet (my account, and so on). */
  moreItems?: FrameNavItem[]
  /** The bottom of the sidebar: a small, quiet Akoso mark. */
  sidebarFooter?: ReactNode
  /** Above the page, for a status notice or the offline indicator. */
  notice?: ReactNode
  children: ReactNode
}

const COLLAPSE_KEY = "akoso.sidebar.collapsed"
const collapseListeners = new Set<() => void>()

function subscribeCollapsed(listener: () => void): () => void {
  collapseListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    collapseListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    // Storage can be unavailable (private mode); the sidebar stays open.
    return false
  }
}

/** Whether the sidebar is collapsed, remembered on this device. Open on the server. */
function useCollapsed(): [boolean, (next: boolean) => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false
  )
  const update = (next: boolean) => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0")
    } catch {
      // Not remembered this time; nothing else depends on it.
    }
    for (const listener of collapseListeners) listener()
  }
  return [collapsed, update]
}

export function AppFrame({
  pathname,
  link,
  icons,
  brand,
  account,
  nav,
  bottomNav,
  moreItems = [],
  sidebarFooter,
  notice,
  children,
}: AppFrameProps): JSX.Element {
  const [collapsed, setCollapsed] = useCollapsed()
  const everything = [...nav, ...moreItems]

  return (
    <>
      <SkipLink />
      <div
        className={cn(
          "min-h-svh lg:grid",
          collapsed ? "lg:grid-cols-[4.5rem_1fr]" : "lg:grid-cols-[16rem_1fr]"
        )}
      >
        <aside
          className="sticky top-0 hidden h-svh flex-col border-r border-border bg-background lg:flex"
          data-testid="sidebar"
          data-collapsed={collapsed ? "true" : "false"}
        >
          <div
            className={cn(
              "flex min-h-16 items-center border-b border-border px-3",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <span className="sr-only">Menu</span>
            ) : (
              <div className="min-w-0 flex-1">{brand}</div>
            )}
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
            <NavList
              items={nav}
              icons={icons}
              pathname={pathname}
              link={link}
              collapsed={collapsed}
            />
          </nav>
          <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={() => {
                setCollapsed(!collapsed)
              }}
              aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
              aria-expanded={!collapsed}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-base text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon
                icon={collapsed ? CaretDoubleRightIcon : CaretDoubleLeftIcon}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
            {!collapsed && sidebarFooter}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header
            className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-6"
            data-testid="top-bar"
          >
            {bottomNav === null && (
              <div className="lg:hidden">
                <MenuSheet
                  label="Menu"
                  side="left"
                  items={everything}
                  icons={icons}
                  pathname={pathname}
                  link={link}
                  trigger={
                    <>
                      <Icon icon={ListIcon} size="lg" />
                      <span className="sr-only">Menu</span>
                    </>
                  }
                />
              </div>
            )}
            {/* On computers the sidebar shows the brand. */}
            <div className="min-w-0 flex-1 lg:invisible">{brand}</div>
            <div className="shrink-0">{account}</div>
          </header>

          {notice}

          <main
            id="main"
            tabIndex={-1}
            className={cn(
              "flex-1 outline-none",
              bottomNav !== null && "pb-20 lg:pb-0"
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {bottomNav !== null && (
        <div className="lg:hidden">
          <BottomBar
            items={bottomNav}
            moreItems={everything}
            icons={icons}
            pathname={pathname}
            link={link}
          />
        </div>
      )}
    </>
  )
}
