import type { JSX, ReactNode } from "react"

import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { SettingsNav, type SettingsNavProps } from "./settings-nav"

/**
 * Every school settings page inside the app frame: its title, the settings tabs (handy
 * on phones, where the sidebar is hidden), and the page.
 */
export function SettingsShell({
  title,
  nav,
  above,
  children,
}: {
  title: string
  nav: SettingsNavProps
  above?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <PageBody>
      <PageHeader title={title} above={above} />
      <div className="flex flex-col gap-6">
        <SettingsNav {...nav} />
        {children}
      </div>
    </PageBody>
  )
}
