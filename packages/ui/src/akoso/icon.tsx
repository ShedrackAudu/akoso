import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
} from "@phosphor-icons/react"
import type { JSX } from "react"

/** The only icon sizes used in Akoso, in pixels (brief section 4.1). */
const ICON_SIZES = { sm: 16, md: 20, lg: 24 } as const

export type IconSize = keyof typeof ICON_SIZES

export type IconProps = Omit<PhosphorIconProps, "weight" | "size"> & {
  /**
   * A Phosphor icon, imported individually with its `...Icon` name.
   * Server components import from `@phosphor-icons/react/ssr`; client components from
   * `@phosphor-icons/react`.
   */
  icon: PhosphorIcon
  size?: IconSize
  /**
   * Filled weight for active or selected states, status indicators, small sizes and one
   * key item per screen. Outline is the default. Switch a state by changing this prop on
   * the same icon, never by swapping in a different icon.
   */
  filled?: boolean
}

/**
 * The one way to render an icon. It allows only two Phosphor weights, `regular` and
 * `fill`, and three sizes, so every screen looks the same.
 *
 * Icons are decorative unless given an `aria-label`. An icon-only button puts its
 * accessible label on the button, not on the icon.
 */
export function Icon({
  icon: Glyph,
  size = "md",
  filled = false,
  ...props
}: IconProps): JSX.Element {
  const isLabelled = props["aria-label"] !== undefined
  return (
    <Glyph
      aria-hidden={isLabelled ? undefined : true}
      {...props}
      size={ICON_SIZES[size]}
      weight={filled ? "fill" : "regular"}
    />
  )
}
