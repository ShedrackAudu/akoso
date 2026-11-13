// A school's own settings (spec: stage-1-sign-in-part-b.md, section 2). Declared here
// with a schema and a default; the school_settings table holds only overrides. A stored
// value that fails its schema is ignored in favour of the default.
import { z } from "zod"

import { ROLE_KEYS } from "./permissions"

export const SCHOOL_SETTINGS = {
  /**
   * Built-in staff roles the school says must use a second step, beyond proprietor,
   * school administrator and bursar, which always must.
   */
  "security.mfa_roles": {
    schema: z
      .array(z.enum(ROLE_KEYS).exclude(["guardian"]))
      .max(ROLE_KEYS.length),
    default: [] as string[],
  },
} as const

export type SchoolSettingKey = keyof typeof SCHOOL_SETTINGS
export type SchoolSettingValue<Key extends SchoolSettingKey> = z.output<
  (typeof SCHOOL_SETTINGS)[Key]["schema"]
>
