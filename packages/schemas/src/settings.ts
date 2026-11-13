// Platform-wide settings (brief rule 10: limits and prices are data; spec
// stage-1-time-audit-flags.md, section 4). Declared here with a schema and a default;
// the platform_settings table holds only overrides. A stored value that fails its
// schema is ignored in favour of the default.
import { z } from "zod"

const perMinute = z.number().int().min(1).max(100_000)

/** Requests per minute for each request class (item 3), by user, school and IP. */
const apiLimitsSchema = z.object({
  standard: z.object({ user: perMinute, tenant: perMinute, ip: perMinute }),
  write: z.object({ user: perMinute, tenant: perMinute, ip: perMinute }),
  export: z.object({ user: perMinute, tenant: perMinute, ip: perMinute }),
  public: z.object({ ip: perMinute }),
})

const count = z.number().int().min(1).max(10_000)

/** Sign-in limits (sign-in spec, section 7). */
const signInLimitsSchema = z.object({
  codesPerNumberPer15Minutes: count,
  codesPerNumberPerDay: count,
  codesPerIpPerHour: count,
  codesPerNumberAbroadPer15Minutes: count,
  passwordAttemptsPerAccountPer15Minutes: count,
  passwordAttemptsPerIpPer15Minutes: count,
})

export const SETTINGS = {
  "limits.api": {
    schema: apiLimitsSchema,
    default: {
      standard: { user: 120, tenant: 1200, ip: 300 },
      write: { user: 60, tenant: 600, ip: 120 },
      export: { user: 5, tenant: 20, ip: 10 },
      public: { ip: 60 },
    },
  },
  "limits.sign_in": {
    schema: signInLimitsSchema,
    default: {
      codesPerNumberPer15Minutes: 3,
      codesPerNumberPerDay: 10,
      codesPerIpPerHour: 20,
      codesPerNumberAbroadPer15Minutes: 1,
      passwordAttemptsPerAccountPer15Minutes: 5,
      passwordAttemptsPerIpPer15Minutes: 30,
    },
  },
} as const

export type SettingKey = keyof typeof SETTINGS
export type SettingValue<Key extends SettingKey> = z.output<
  (typeof SETTINGS)[Key]["schema"]
>
