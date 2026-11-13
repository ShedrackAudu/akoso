// Feature flags and platform settings (spec acceptance criteria 7 and 8).
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"
import { SETTINGS } from "@akoso/schemas/settings"

import { clearSettingsCache, getSetting } from "../kernel/index"
import { memoryLogger, testContext } from "../testing/index"
import { clearFlagCache, isEnabled } from "./flags"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"
const app = createDatabase(APP_URL, 2)
const owner = createDatabase(OWNER_URL, 1)
afterAll(async () => {
  await owner.db.execute(
    sql`delete from platform.tenant_feature_flags where flag_key = 'system.example'`
  )
  await owner.db.execute(
    sql`delete from platform.platform_settings where key = 'limits.api'`
  )
  clearSettingsCache()
  await app.close()
  await owner.close()
})

const GREENFIELD = "9a000000-0000-4000-8000-000000000001"
const ST_ANNES = "9a000000-0000-4000-8000-000000000002"

beforeEach(() => {
  clearFlagCache()
  clearSettingsCache()
})

describe("feature flags", () => {
  it("are off by default, and an override turns one on for that school only", async () => {
    await owner.db.execute(
      sql`delete from platform.tenant_feature_flags where flag_key = 'system.example'`
    )
    const greenfield = testContext({ db: app.db, tenantId: GREENFIELD })
    const stAnnes = testContext({ db: app.db, tenantId: ST_ANNES })
    expect(await isEnabled(greenfield, "system.example")).toBe(false)

    await owner.db.execute(sql`
      insert into platform.tenant_feature_flags (tenant_id, flag_key, enabled)
      values (${GREENFIELD}, 'system.example', true)`)
    clearFlagCache()
    expect(await isEnabled(greenfield, "system.example")).toBe(true)
    expect(await isEnabled(stAnnes, "system.example")).toBe(false)
  })

  it("cannot be changed by the app role", async () => {
    await expect(
      app.db.execute(sql`
        insert into platform.tenant_feature_flags (tenant_id, flag_key, enabled)
        values (${GREENFIELD}, 'system.other', true)`)
    ).rejects.toThrow()
  })
})

describe("platform settings", () => {
  it("default to the values in code", async () => {
    await owner.db.execute(
      sql`delete from platform.platform_settings where key = 'limits.api'`
    )
    expect(await getSetting(app.db, "limits.api")).toEqual(
      SETTINGS["limits.api"].default
    )
  })

  it("use a valid stored override", async () => {
    const custom = { ...SETTINGS["limits.api"].default, public: { ip: 30 } }
    await owner.db.execute(sql`
      insert into platform.platform_settings (key, value) values ('limits.api', ${JSON.stringify(custom)}::jsonb)
      on conflict (key) do update set value = excluded.value`)
    expect((await getSetting(app.db, "limits.api")).public.ip).toBe(30)
  })

  it("ignore a malformed stored value, with a warning", async () => {
    await owner.db.execute(sql`
      insert into platform.platform_settings (key, value) values ('limits.api', '{"public": "lots"}'::jsonb)
      on conflict (key) do update set value = excluded.value`)
    const { log, lines } = memoryLogger()
    expect(await getSetting(app.db, "limits.api", { log })).toEqual(
      SETTINGS["limits.api"].default
    )
    expect(lines.join("\n")).toContain("Stored setting is invalid")
  })

  it("cannot be changed by the app role", async () => {
    await expect(
      app.db.execute(sql`delete from platform.platform_settings`)
    ).rejects.toThrow()
  })
})
