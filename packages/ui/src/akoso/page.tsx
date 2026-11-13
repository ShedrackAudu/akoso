// The parts every page inside the app frame uses, so pages line up (app frame spec,
// section 6): a title block, one of three widths, and a calm empty state.
import type { JSX, ReactNode } from "react"

import { cn } from "cn"

/** A page's title (Merriweather), an optional one-line description, and actions. */
export function PageHeader({
  title,
  description,
  actions,
  above,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** A small line above the title, such as a link back to a list. */
  above?: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 pb-6">
      {above !== undefined && <div className="text-base">{above}</div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold break-words">
            {title}
          </h1>
          {description !== undefined && (
            <p className="text-base text-muted-foreground">{description}</p>
          )}
        </div>
        {actions !== undefined && (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}

const WIDTHS = {
  /** Forms, such as My account: about 640 px. */
  narrow: "max-w-2xl",
  /** Most pages: about 1024 px. */
  standard: "max-w-5xl",
  /** Tables and broadsheets: the full width. */
  wide: "max-w-none",
} as const

export type PageWidth = keyof typeof WIDTHS

/** The page's content area, in one of three widths, with the same side spacing. */
export function PageBody({
  width = "standard",
  className,
  children,
}: {
  width?: PageWidth
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6",
        WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  )
}

/** Nothing to show yet: one calm sentence, an optional icon and action. */
export function EmptyState({
  icon,
  children,
  action,
}: {
  icon?: ReactNode
  children: ReactNode
  action?: ReactNode
}): JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
      data-testid="empty-state"
    >
      {icon !== undefined && (
        <div className="text-muted-foreground">{icon}</div>
      )}
      <p className="max-w-md text-base text-muted-foreground">{children}</p>
      {action !== undefined && <div>{action}</div>}
    </div>
  )
}
