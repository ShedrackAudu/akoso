import type { Metadata } from "next"
import type { JSX } from "react"

import { BRAND_NAME } from "@akoso/core/config"

export const metadata: Metadata = { title: "Offline" }

// Shown for a page the phone has never opened before, when there is no connection.
export default function Offline(): JSX.Element {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-heading text-2xl font-bold">You are offline</h1>
      <p className="text-sm text-muted-foreground">
        This page has not been opened on this phone before, so {BRAND_NAME}{" "}
        cannot show it without a connection. Pages you have opened before still
        work.
      </p>
    </main>
  )
}
