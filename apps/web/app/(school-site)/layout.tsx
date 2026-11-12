import type { Metadata, Viewport } from "next"
import type { JSX, ReactNode } from "react"

import "@akoso/ui/globals.css"
import { cn } from "@akoso/ui/lib/utils"

import { figtree, merriweather } from "@/app/fonts"

// The root layout for a school's own address ({slug}.{domain} or its custom domain).
// Public pages only: no service worker, no theme script, nothing that sets a cookie.
// Sign-in happens only at app.{domain} (brief section 7).
export const metadata: Metadata = {
  robots: { index: true, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function SchoolSiteLayout({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html
      lang="en-NG"
      className={cn(
        "font-sans antialiased",
        figtree.variable,
        merriweather.variable
      )}
    >
      <body>{children}</body>
    </html>
  )
}
