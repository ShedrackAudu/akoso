// A round mark with initials: a school's until it uploads a logo, or a person's in their
// menu (app frame spec, section 5). The school comes first, so this never shows the
// Akoso mark.
import type { JSX } from "react"

import { cn } from "cn"

/** Up to two initials: the first letters of the first two words that start with one. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
  const letters = words.slice(0, 2).map((word) => word.charAt(0))
  return letters.join("").toUpperCase() || "?"
}

export function Monogram({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md"
  className?: string
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        size === "sm" ? "size-8 text-sm" : "size-9 text-sm",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
