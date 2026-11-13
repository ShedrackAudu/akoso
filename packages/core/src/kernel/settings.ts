// Platform settings (spec: stage-1-time-audit-flags.md, section 4): the default in
// packages/schemas/src/settings.ts unless an override is stored. Cached for a minute
// per instance, so a change reaches every instance within a minute.
import { sql, type Database } from "@akoso/db"
import {
  SETTINGS,
  type SettingKey,
  type SettingValue,
} from "@akoso/schemas/settings"

import { createLogger, type Logger } from "./logger"

const TTL_MS = 60_000
const cache = new Map<SettingKey, { value: unknown; expires: number }>()
const fallbackLog = createLogger({ job: "settings" })

/**
 * The current value of a setting. A stored value that fails the setting's schema is
 * ignored (with a warning), so a bad edit can never take a limit away.
 */
export async function getSetting<Key extends SettingKey>(
  db: Database,
  key: Key,
  options: { now?: () => number; log?: Logger } = {}
): Promise<SettingValue<Key>> {
  const now = options.now ?? Date.now
  const cached = cache.get(key)
  if (cached !== undefined && cached.expires > now()) {
    return cached.value as SettingValue<Key>
  }
  const definition = SETTINGS[key]
  let value: unknown = definition.default
  const result = await db.execute(
    sql`select value from platform.platform_settings where key = ${key}`
  )
  const stored = result.rows[0]
  if (stored !== undefined) {
    const parsed = definition.schema.safeParse(stored.value)
    if (parsed.success) value = parsed.data
    else {
      ;(options.log ?? fallbackLog).warn(
        "Stored setting is invalid; using its default",
        { code: key }
      )
    }
  }
  cache.set(key, { value, expires: now() + TTL_MS })
  return value as SettingValue<Key>
}

/** Forgets cached settings. For tests, and after a change on this instance. */
export function clearSettingsCache(): void {
  cache.clear()
}
