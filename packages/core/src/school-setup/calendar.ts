// The school calendar, step 3 (spec: docs/specs/stage-2-school-setup-a.md, section 4):
// public holidays, closures and other days off. Suggested fixed holidays are added only
// when the school confirms them.
import type { z } from "zod"

import { sql, withTenant } from "@akoso/db"
import {
  SETUP_LIMITS,
  type addNonSchoolDayInput,
  type confirmHolidaysInput,
  type nonSchoolDayRefInput,
} from "@akoso/schemas/school-setup"

import { recordAudit } from "../audit/index"
import {
  authorize,
  NotFoundError,
  requireTenant,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { asText, checkCap } from "./shared"

export async function addNonSchoolDay(
  ctx: RequestContext,
  input: z.output<typeof addNonSchoolDayInput>
): Promise<{ id: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  if (input.endsOn < input.startsOn) {
    throw ValidationError.of(
      "endsOn",
      "The last day can't be before the first."
    )
  }
  return withTenant(ctx.db, tenantId, async (tx) => {
    await checkCap(
      tx,
      "non_school_days",
      SETUP_LIMITS.nonSchoolDays,
      1,
      "days off"
    )
    const result = await tx.execute(sql`
      insert into school_setup.non_school_days (tenant_id, starts_on, ends_on, reason, note)
      values (${tenantId}, ${input.startsOn}, ${input.endsOn}, ${input.reason}, ${input.note})
      returning id`)
    const id = String(result.rows[0]?.id)
    await recordAudit(tx, ctx, {
      action: "non_school_day.added",
      entityType: "non_school_day",
      entityId: id,
      changes: {
        startsOn: { before: null, after: input.startsOn },
        endsOn: { before: null, after: input.endsOn },
        reason: { before: null, after: input.reason },
        note: { before: null, after: input.note },
      },
    })
    return { id }
  })
}

export async function removeNonSchoolDay(
  ctx: RequestContext,
  input: z.output<typeof nonSchoolDayRefInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      delete from school_setup.non_school_days where id = ${input.id}
      returning starts_on::text, ends_on::text, reason, note`)
    const row = result.rows[0]
    if (row === undefined) throw new NotFoundError()
    await recordAudit(tx, ctx, {
      action: "non_school_day.removed",
      entityType: "non_school_day",
      entityId: input.id,
      changes: {
        startsOn: { before: row.starts_on, after: null },
        endsOn: { before: row.ends_on, after: null },
        reason: { before: row.reason, after: null },
        note: { before: row.note, after: null },
      },
    })
  })
}

/**
 * Adds the suggested holidays the school ticked. A date already covered by a day off is
 * skipped, so confirming twice adds nothing twice.
 */
export async function confirmHolidays(
  ctx: RequestContext,
  input: z.output<typeof confirmHolidaysInput>
): Promise<{ added: number }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  return withTenant(ctx.db, tenantId, async (tx) => {
    await checkCap(
      tx,
      "non_school_days",
      SETUP_LIMITS.nonSchoolDays,
      input.holidays.length,
      "days off"
    )
    let added = 0
    for (const holiday of input.holidays) {
      const result = await tx.execute(sql`
        insert into school_setup.non_school_days (tenant_id, starts_on, ends_on, reason, note)
        select ${tenantId}, ${holiday.date}, ${holiday.date}, 'public_holiday', ${holiday.name}
        where not exists (
          select 1 from school_setup.non_school_days
          where starts_on <= ${holiday.date}::date and ends_on >= ${holiday.date}::date)
        returning id`)
      const id = result.rows[0]?.id
      if (id === undefined) continue
      added++
      await recordAudit(tx, ctx, {
        action: "non_school_day.added",
        entityType: "non_school_day",
        entityId: asText(id),
        changes: {
          startsOn: { before: null, after: holiday.date },
          endsOn: { before: null, after: holiday.date },
          reason: { before: null, after: "public_holiday" },
          note: { before: null, after: holiday.name },
        },
      })
    }
    return { added }
  })
}
