import { SerwistProvider } from "@serwist/turbopack/react"
import type { Metadata, Viewport } from "next"
import type { JSX, ReactNode } from "react"

import { BRAND_LINES, BRAND_NAME } from "@akoso/core/config"
import "@akoso/ui/globals.css"
import { cn } from "@akoso/ui/lib/utils"

import { geistMono, figtree, merriweather } from "@/app/fonts"
import { DevServiceWorkerCleanup } from "@/components/dev-service-worker-cleanup"
import { ThemeProvider } from "@/components/theme-provider"

// The offline service worker is for production builds only: under `next dev` it gets
// in the way of the development server's files (pages load without styles).
const DEVELOPMENT = process.env.NODE_ENV === "development"

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: BRAND_LINES.lead,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

// The signed-in app's root layout, on app.{domain} only: it registers the offline
// service worker. School addresses use app/(school-site)/layout.tsx, which does not.
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html
      lang="en-NG"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        figtree.variable,
        merriweather.variable,
        geistMono.variable
      )}
    >
      <body>
        {/* No reload on reconnect: it would throw away a teacher's half-typed entry. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          reloadOnOnline={false}
          disable={DEVELOPMENT}
        >
          {DEVELOPMENT && <DevServiceWorkerCleanup />}
          <ThemeProvider>{children}</ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  )
}
