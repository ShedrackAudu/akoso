// The school's brand colour (school setup part A spec, section 2; brief 4.1). It is used
// for filled surfaces with white text and for accents on a light page, so it must reach
// WCAG AA (4.5:1) against white.
const HEX = /^#[0-9a-f]{6}$/

/** "#1F6FEB" or "1f6feb" as "#1f6feb"; null when it is not a six-digit hex colour. */
export function normaliseHexColour(input: string): string | null {
  const value = input.trim().toLowerCase()
  const withHash = value.startsWith("#") ? value : `#${value}`
  return HEX.test(withHash) ? withHash : null
}

function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a "#rrggbb" colour. */
export function relativeLuminance(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16)
  const green = parseInt(hex.slice(3, 5), 16)
  const blue = parseInt(hex.slice(5, 7), 16)
  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  )
}

/** The WCAG contrast ratio of two "#rrggbb" colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((a, b) => b - a)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

export const BRAND_MIN_CONTRAST = 4.5

/** Whether white text on the colour, and the colour on a white page, can be read. */
export const brandColourReadable = (hex: string): boolean =>
  contrastRatio(hex, "#ffffff") >= BRAND_MIN_CONTRAST
