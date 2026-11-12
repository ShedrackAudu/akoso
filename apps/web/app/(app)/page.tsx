import Image from "next/image"
import Link from "next/link"
import type { JSX } from "react"

import { BRAND_LINES, BRAND_NAME } from "@akoso/core/config"
import { buttonVariants } from "@akoso/ui/components/button"

const MARK_SIZE = 96

// Scaffold placeholder. It proves the preset, fonts, brand assets and workspace
// packages are wired together. The first real screen replaces it in Stage 1.
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
        <h1 className="font-heading text-3xl font-bold">{BRAND_NAME}</h1>
        <p className="text-base text-muted-foreground">{BRAND_LINES.lead}</p>
        <Link
          href="/sign-in"
          className={buttonVariants({
            size: "lg",
            // 44 px: the minimum tap target (brief section 4).
            className: "h-11 px-6 text-base",
          })}
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
