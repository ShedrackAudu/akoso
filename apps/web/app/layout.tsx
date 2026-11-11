import { SerwistProvider } from "@serwist/turbopack/react"
import type { Metadata, Viewport } from "next"
import { Figtree, Geist_Mono, Merriweather } from "next/font/google"
import type { JSX, ReactNode } from "react"

import { BRAND_LINES, BRAND_NAME } from "@akoso/core/config"
import "@akoso/ui/globals.css"
import { cn } from "@akoso/ui/lib/utils"

import { ThemeProvider } from "@/components/theme-provider"

// Fonts come from the shadcn preset: Figtree for body text, Merriweather for headings.
// next/font self-hosts them at build time, so no request goes to Google from a parent's phone.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

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
        <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline={false}>
          <ThemeProvider>{children}</ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  )
}
