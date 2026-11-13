import Link from "next/link"
import type { JSX, ReactNode } from "react"

import { SettingsNav, type SettingsNavProps } from "./settings-nav"

/** The frame of every school settings page: title, tabs, a way back. */
export function SettingsShell({
  schoolName,
  title,
  nav,
  children,
}: {
  schoolName: string
  title: string
  nav: SettingsNavProps
  children: ReactNode
}): JSX.Element {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/${encodeURIComponent(nav.school)}`}
          className="text-base text-primary underline"
        >
          {schoolName}
        </Link>
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
      </div>
      <SettingsNav {...nav} />
      {children}
    </main>
  )
}
