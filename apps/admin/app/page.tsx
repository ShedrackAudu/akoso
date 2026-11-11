import Image from "next/image"
import type { JSX } from "react"

import { BRAND_NAME } from "@akoso/core/config"

// Scaffold placeholder for the platform admin (brief section 26). No admin feature exists yet.
export default function Page(): JSX.Element {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Image
          src="/icon-192.png"
          alt=""
          width={96}
          height={96}
          priority
          className="rounded-3xl"
        />
        <h1 className="font-heading text-3xl font-bold">{BRAND_NAME} Admin</h1>
        <p className="text-base text-muted-foreground">
          For the Akoso team only.
        </p>
      </div>
    </main>
  )
}
