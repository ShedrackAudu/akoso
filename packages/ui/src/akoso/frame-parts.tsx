"use client"

// The pieces both app frames share (spec: docs/specs/stage-2-app-frame.md): the
// navigation list, the More sheet and the phone's bottom bar. Navigation icons are not
// imported here: each app passes only the icons its frame uses, so a parent's phone
// never downloads the staff menu's icons (each Phosphor icon carries all six weights).
import {
  DotsThreeOutlineIcon,
  XIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react"
import {
  useId,
  useRef,
  type ComponentType,
  type JSX,
  type ReactNode,
} from "react"

import { cn } from "cn"

import { Icon } from "./icon"

/** The icons navigation may use, by name, so server code can describe items. */
export type NavIconKey =
  | "home"
  | "setup"
  | "people"
  | "settings"
  | "roles"
  | "log"
  | "security"
  | "account"
  | "passkey"

/** The icon for each name an app's navigation uses. */
export type FrameIcons = Partial<Record<NavIconKey, PhosphorIcon>>

export interface FrameNavItem {
  key: string
  label: string
  href: string
  icon: NavIconKey
  /** Active only on this exact address (a home page), not on pages below it. */
  exact?: boolean
  children?: FrameNavItem[]
}

/** How the app renders a link (Next's Link), so this package needs no framework. */
export type FrameLink = ComponentType<{
  href: string
  className?: string
  children: ReactNode
  "aria-current"?: "page"
  "aria-label"?: string
  onClick?: () => void
}>

export function isActive(item: FrameNavItem, pathname: string): boolean {
  if (item.exact === true) return pathname === item.href
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true
  }
  return (item.children ?? []).some((child) => isActive(child, pathname))
}

/** The first thing a keyboard reaches: straight to the page. */
export function SkipLink(): JSX.Element {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-background px-4 py-2 text-base focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
  )
}

function NavLink({
  item,
  icons,
  pathname,
  link: Link,
  collapsed = false,
  nested = false,
  onNavigate,
}: {
  item: FrameNavItem
  icons: FrameIcons
  pathname: string
  link: FrameLink
  collapsed?: boolean
  nested?: boolean
  onNavigate?: () => void
}): JSX.Element {
  const active = isActive(item, pathname)
  const current = item.exact === true ? active : pathname === item.href
  const glyph = icons[item.icon]
  const content = (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-base outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-muted font-semibold text-foreground",
        !active && "text-muted-foreground",
        nested && "pl-10 text-sm",
        collapsed && "justify-center px-0"
      )}
    >
      {!nested && glyph !== undefined && <Icon icon={glyph} filled={active} />}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
  if (!collapsed) return content
  // Collapsed: the link keeps its spoken name; the title shows it on hover.
  return <span title={item.label}>{content}</span>
}

export function NavList({
  items,
  icons,
  pathname,
  link,
  collapsed = false,
  onNavigate,
}: {
  items: FrameNavItem[]
  icons: FrameIcons
  pathname: string
  link: FrameLink
  collapsed?: boolean
  onNavigate?: () => void
}): JSX.Element {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key}>
          <NavLink
            item={item}
            icons={icons}
            pathname={pathname}
            link={link}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          {!collapsed &&
            item.children !== undefined &&
            isActive(item, pathname) && (
              <ul className="mt-1 flex flex-col gap-1">
                {item.children.map((child) => (
                  <li key={child.key}>
                    <NavLink
                      item={child}
                      icons={icons}
                      pathname={pathname}
                      link={link}
                      nested
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            )}
        </li>
      ))}
    </ul>
  )
}

/**
 * The More sheet (phones) or menu sheet: everything, one tap away. It is the browser's
 * own <dialog>: it traps focus, closes on Escape, and costs nothing to download, which
 * matters on parents' phones (brief 18).
 */
export function MenuSheet({
  label,
  side,
  trigger,
  items,
  icons,
  pathname,
  link,
  footer,
}: {
  label: string
  side: "bottom" | "left"
  trigger: ReactNode
  items: FrameNavItem[]
  icons: FrameIcons
  pathname: string
  link: FrameLink
  footer?: ReactNode
}): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => {
    dialog.current?.close()
  }
  // Show every item, children included, so nothing is two levels deep on a phone.
  const flat = items.flatMap((item) =>
    item.children === undefined || item.children.length === 0
      ? [item]
      : item.children
  )
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal()
        }}
        className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-2 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {trigger}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          // A tap on the backdrop (outside the panel) closes it.
          if (event.target === dialog.current) close()
        }}
        className={cn(
          "m-0 max-h-none max-w-none bg-transparent p-0 text-foreground backdrop:bg-black/50",
          side === "bottom"
            ? "top-auto bottom-0 w-full"
            : "top-0 left-0 h-full w-80 max-w-[85vw]"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-2 border-border bg-background px-3 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            side === "bottom"
              ? "max-h-[80svh] overflow-y-auto rounded-t-xl border-t"
              : "h-full overflow-y-auto border-r"
          )}
        >
          <div className="flex items-center justify-between px-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {label}
            </h2>
            <button
              type="button"
              onClick={close}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon icon={XIcon} />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <nav aria-label={label}>
            <NavList
              items={flat}
              icons={icons}
              pathname={pathname}
              link={link}
              onNavigate={close}
            />
          </nav>
          {footer !== undefined && (
            <div className="border-t border-border pt-2">{footer}</div>
          )}
        </div>
      </dialog>
    </>
  )
}

/** The phone's bottom bar: up to 4 items, then More (app frame spec, section 2). */
export function BottomBar({
  items,
  moreItems,
  moreFooter,
  icons,
  pathname,
  link: Link,
}: {
  items: FrameNavItem[]
  moreItems: FrameNavItem[]
  moreFooter?: ReactNode
  icons: FrameIcons
  pathname: string
  link: FrameLink
}): JSX.Element {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
      data-testid="bottom-bar"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2">
        {items.slice(0, 4).map((item) => {
          const active = isActive(item, pathname)
          const glyph = icons[item.icon]
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  // The selected item: the normal text colour (the brand violet is too
                  // dark for text in dark mode), bold, with a filled icon.
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {glyph !== undefined && (
                  <Icon icon={glyph} size="lg" filled={active} />
                )}
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
        <li className="flex flex-1 items-center justify-center">
          <MenuSheet
            label="More"
            side="bottom"
            items={moreItems}
            icons={icons}
            pathname={pathname}
            link={Link}
            footer={moreFooter}
            trigger={
              <>
                <Icon icon={DotsThreeOutlineIcon} size="lg" />
                <span>More</span>
              </>
            }
          />
        </li>
      </ul>
    </nav>
  )
}
