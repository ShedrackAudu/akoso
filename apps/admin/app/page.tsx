import Image from "next/image"
import type { JSX } from "react"

import { BRAND_NAME } from "@akoso/core/config"

const MARK_SIZE = 96

// Scaffold placeholder for the platform admin (brief section 26). No admin feature exists yet.
export default function Page(): JSX.Element {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {/* The logo is always the SVG, served as it is, so it stays crisp at any
            size. One file per theme; the other is hidden. */}
        <Image
          src="/brand/akoso-mark-tassel-on-light.svg"
          alt=""
          width={MARK_SIZE}
          height={MARK_SIZE}
          unoptimized
          priority
          className="dark:hidden"
        />
        <Image
          src="/brand/akoso-mark-tassel-on-deep.svg"
          alt=""
          width={MARK_SIZE}
          height={MARK_SIZE}
          unoptimized
          priority
          className="hidden dark:block"
        />
        <h1 className="font-heading text-3xl font-bold">{BRAND_NAME} Admin</h1>
        <p className="text-base text-muted-foreground">
          For the Akoso team only.
        </p>
      </div>
    </main>
  )
}
