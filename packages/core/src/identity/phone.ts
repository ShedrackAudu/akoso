// Phone numbers in one form, E.164 (+2348031234567), whatever way they were typed:
// 0803 123 4567, 234-803-123-4567, +234 (0) 803..., or a number from abroad.
import { parsePhoneNumberFromString } from "libphonenumber-js/max"

/** The number in E.164, or null when it is not a valid phone number. Nigeria by default. */
export function normalisePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), "NG")
  if (parsed === undefined || !parsed.isValid()) return null
  return parsed.number
}

export const isNigerianNumber = (e164: string): boolean =>
  e164.startsWith("+234")
