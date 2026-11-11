"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps, JSX } from "react"

// Light and dark themes come from the preset. The theme follows the phone's setting.
// The preset template's single-key "d" shortcut was removed: an unmodified character
// shortcut that cannot be turned off fails WCAG 2.1.4.
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>): JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
