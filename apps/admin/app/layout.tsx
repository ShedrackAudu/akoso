import type { Metadata, Viewport } from "next"
import { Figtree, Geist_Mono, Merriweather } from "next/font/google"
import type { JSX, ReactNode } from "react"

import { BRAND_NAME } from "@akoso/core/config"
import "@akoso/ui/globals.css"
import { cn } from "@akoso/ui/lib/utils"

import { ThemeProvider } from "@/components/theme-provider"

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
  title: {
    default: `${BRAND_NAME} Admin`,
    template: `%s · ${BRAND_NAME} Admin`,
  },
  // The platform admin is for the Akoso team only and must never be indexed.
  robots: { index: false, follow: false },
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
