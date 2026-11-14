// The school profile, step 1 (spec: docs/specs/stage-2-school-setup-a.md, section 2).
import type { z } from "zod"

import { sql, withTenant } from "@akoso/db"
import { schoolSetup, time } from "@akoso/domain"
import type { saveProfileInput } from "@akoso/schemas/school-setup"

import { diffForAudit, recordAudit } from "../audit/index"
import { normalisePhone } from "../identity/index"
import {
  authorize,
  requireTenant,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { readSchoolIdentity, updateSchoolIdentity } from "../tenancy/index"
import { checkVersion, versionOf } from "./shared"

export async function saveSchoolProfile(
  ctx: RequestContext,
  input: z.output<typeof saveProfileInput>
): Promise<{ version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)

  if (!time.isValidTimeZone(input.timeZone)) {
    throw ValidationError.of("timeZone", "Choose a time zone from the list")
  }
  const state = input.state === "" ? null : input.state
  if (
    state !== null &&
    !(schoolSetup.NIGERIAN_STATES as readonly string[]).includes(state)
  ) {
    throw ValidationError.of("state", "Choose a state from the list")
  }
  let phone: string | null = null
  if (input.phone !== "") {
    phone = normalisePhone(input.phone)
    if (phone === null) {
      throw ValidationError.of(
        "phone",
        "Enter a phone number like 0803 123 4567"
      )
    }
  }
  let brandColour: string | null = null
  if (input.brandColour !== "") {
    brandColour = schoolSetup.normaliseHexColour(input.brandColour)
    if (brandColour === null) {
      throw ValidationError.of("brandColour", "Enter a colour like #5b21b6")
    }
    if (!schoolSetup.brandColourReadable(brandColour)) {
      throw ValidationError.of(
        "brandColour",
        "That colour is too light for white text to be read on it. Choose a darker shade."
      )
    }
  }
  const schoolTypes = schoolSetup.SCHOOL_TYPES.filter((type) =>
    input.schoolTypes.includes(type)
  )
  const after = {
    name: input.name,
    timeZone: input.timeZone,
    schoolTypes,
    motto: input.motto,
    address: input.address,
    state,
    lga: input.lga,
    phone,
    email: input.email === "" ? null : input.email.toLowerCase(),
    brandColour,
  }

  return withTenant(ctx.db, tenantId, async (tx) => {
    const found = await tx.execute(
      sql`select * from school_setup.school_profiles for update`
    )
    const row = found.rows[0]
    if (row !== undefined) checkVersion(row.updated_at, input.version)
    const identity = await readSchoolIdentity(tx, tenantId)
    const before =
      row === undefined
        ? null
        : {
            name: identity.name,
            timeZone: identity.timeZone,
            schoolTypes: row.school_types,
            motto: row.motto,
            address: row.address,
            state: row.state,
            lga: row.lga,
            phone: row.phone,
            email: row.email,
            brandColour: row.brand_colour,
          }

    if (identity.name !== after.name || identity.timeZone !== after.timeZone) {
      await updateSchoolIdentity(tx, {
        name: after.name,
        timeZone: after.timeZone,
      })
    }
    const saved = await tx.execute(sql`
      insert into school_setup.school_profiles
        (tenant_id, school_types, motto, address, state, lga, phone, email, brand_colour)
      values (${tenantId}, ${sql.param(schoolTypes)}::text[], ${after.motto}, ${after.address},
              ${after.state}, ${after.lga}, ${after.phone}, ${after.email}, ${after.brandColour})
      on conflict (tenant_id) do update set
        school_types = excluded.school_types, motto = excluded.motto,
        address = excluded.address, state = excluded.state, lga = excluded.lga,
        phone = excluded.phone, email = excluded.email,
        brand_colour = excluded.brand_colour, updated_at = now()
      returning updated_at`)

    await recordAudit(tx, ctx, {
      action:
        row === undefined ? "school_profile.created" : "school_profile.changed",
      entityType: "school_profile",
      entityId: tenantId,
      changes: diffForAudit(
        before === null
          ? { name: identity.name, timeZone: identity.timeZone }
          : before,
        after
      ),
    })
    return { version: versionOf(saved.rows[0]?.updated_at) }
  })
}
