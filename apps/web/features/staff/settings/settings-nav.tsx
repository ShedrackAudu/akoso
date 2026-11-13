import Link from "next/link"
import type { JSX } from "react"

// The school settings pages a person may open, as tabs.
export interface SettingsNavProps {
  school: string
  current: "team" | "roles" | "security"
  show: { team: boolean; roles: boolean; security: boolean }
}

const LABELS = {
  team: "People with access",
  roles: "Roles",
  security: "Security log",
} as const

export function SettingsNav({
  school,
  current,
  show,
}: SettingsNavProps): JSX.Element {
  const pages = (["team", "roles", "security"] as const).filter(
    (page) => show[page]
  )
  return (
    <nav aria-label="School settings" className="flex flex-wrap gap-2">
      {pages.map((page) => (
        <Link
          key={page}
          href={`/${encodeURIComponent(school)}/settings/${page}`}
          aria-current={page === current ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-base aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
        >
          {LABELS[page]}
        </Link>
      ))}
    </nav>
  )
}
