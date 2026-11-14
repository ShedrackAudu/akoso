// Subjects, step 5 (spec: docs/specs/stage-2-school-setup-a.md, section 6): the school's
// subject list, and which subjects each arm takes. Limits for 2025 arms warn and never
// block. Renaming keeps a subject's identity; removing archives it.
import type { z } from "zod"

import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import { schoolSetup } from "@akoso/domain"
import {
  SETUP_LIMITS,
  type saveSubjectInput,
  type setArmSubjectsInput,
  type setupRefInput,
} from "@akoso/schemas/school-setup"

import { diffForAudit, recordAudit } from "../audit/index"
import {
  authorize,
  NotFoundError,
  requireTenant,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import {
  asText,
  checkCap,
  checkVersion,
  uniqueViolationOf,
  versionOf,
} from "./shared"

function subjectTaken(
  error: unknown,
  input: { name: string; code: string }
): never {
  const constraint = uniqueViolationOf(error)
  if (constraint === "subjects_tenant_code_unique") {
    throw ValidationError.of(
      "code",
      `Another subject already uses the code ${input.code}, perhaps an archived one.`
    )
  }
  if (constraint === "subjects_tenant_name_live") {
    throw ValidationError.of(
      "name",
      `There's already a subject called ${input.name}.`
    )
  }
  throw error
}

export async function saveSubject(
  ctx: RequestContext,
  input: z.output<typeof saveSubjectInput>
): Promise<{ id: string; version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  try {
    return await withTenant(ctx.db, tenantId, async (tx) => {
      let before: Record<string, unknown> | null = null
      if (input.id !== undefined) {
        const found = await tx.execute(sql`
          select id, name, code, kind, nerdc_key, updated_at from school_setup.subjects
          where id = ${input.id} and archived_at is null for update`)
        before = found.rows[0] ?? null
        if (before === null) throw new NotFoundError()
        checkVersion(before.updated_at, input.version)
      } else {
        await checkCap(tx, "subjects", SETUP_LIMITS.subjects, 1, "subjects")
      }
      const result =
        before === null
          ? await tx.execute(sql`
              insert into school_setup.subjects (tenant_id, name, code, kind, nerdc_key)
              values (${tenantId}, ${input.name}, ${input.code}, ${input.kind}, ${input.nerdcKey})
              returning id, updated_at`)
          : await tx.execute(sql`
              update school_setup.subjects
              set name = ${input.name}, code = ${input.code}, kind = ${input.kind},
                  nerdc_key = ${input.nerdcKey}, updated_at = now()
              where id = ${String(before.id)}
              returning id, updated_at`)
      const id = String(result.rows[0]?.id)
      await recordAudit(tx, ctx, {
        action: before === null ? "subject.created" : "subject.changed",
        entityType: "subject",
        entityId: id,
        changes: diffForAudit(
          before === null
            ? null
            : {
                name: before.name,
                code: before.code,
                kind: before.kind,
                nerdcKey: before.nerdc_key,
              },
          {
            name: input.name,
            code: input.code,
            kind: input.kind,
            nerdcKey: input.nerdcKey,
          }
        ),
      })
      return { id, version: versionOf(result.rows[0]?.updated_at) }
    })
  } catch (error) {
    return subjectTaken(error, input)
  }
}

/** Archives a subject: it leaves no arm, but new arms can no longer choose it. */
export async function archiveSubject(
  ctx: RequestContext,
  input: z.output<typeof setupRefInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      update school_setup.subjects set archived_at = now(), updated_at = now()
      where id = ${input.id} and archived_at is null returning id`)
    if (result.rows[0] === undefined) throw new NotFoundError()
    await recordAudit(tx, ctx, {
      action: "subject.archived",
      entityType: "subject",
      entityId: input.id,
      changes: { archived: { before: false, after: true } },
    })
  })
}

export interface ArmSubjectsResult {
  count: number
  /** The 2025 curriculum's range for this arm, or null when none applies. */
  limits: { min: number; max: number } | null
  /** A warning when the count is outside the range; the save happened anyway. */
  warning: string | null
}

/** The warning for an arm's subject count, or null when it is within NERDC's range. */
export function subjectCountWarning(
  count: number,
  limits: { min: number; max: number } | null
): string | null {
  if (limits === null || (count >= limits.min && count <= limits.max))
    return null
  return `NERDC's 2025 curriculum has ${String(limits.min)} to ${String(limits.max)} subjects for this class; this arm has ${String(count)}. It's saved, but check it's what you meant.`
}

async function armRow(
  tx: TenantTransaction,
  armId: string
): Promise<Record<string, unknown>> {
  const found = await tx.execute(sql`
    select a.id, a.curriculum, a.track, c.standard_class
    from school_setup.class_arms a join school_setup.classes c on c.id = a.class_id
    where a.id = ${armId} and a.archived_at is null for update of a`)
  const row = found.rows[0]
  if (row === undefined) throw new NotFoundError()
  return row
}

const limitsFor = (row: Record<string, unknown>) =>
  schoolSetup.subjectLimits(
    (row.standard_class ?? null) as schoolSetup.StandardClassKey | null,
    row.curriculum as schoolSetup.CurriculumVersion
  )

/** Sets which subjects an arm takes, all at once. */
export async function setArmSubjects(
  ctx: RequestContext,
  input: z.output<typeof setArmSubjectsInput>
): Promise<ArmSubjectsResult> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  const wanted = [...new Set(input.subjectIds)]
  return withTenant(ctx.db, tenantId, async (tx) => {
    const arm = await armRow(tx, input.armId)
    const current = await tx.execute(sql`
      select subject_id from school_setup.arm_subjects where arm_id = ${input.armId}`)
    const had = current.rows.map((row) => String(row.subject_id)).sort()
    const added = wanted.filter((id) => !had.includes(id))
    if (added.length > 0) {
      // A new choice must be one of the school's subjects still in use.
      const valid = await tx.execute(sql`
        select id from school_setup.subjects
        where id = any(${sql.param(added)}::uuid[]) and archived_at is null`)
      if (valid.rows.length !== added.length) {
        throw ValidationError.of(
          "subjectIds",
          "Choose subjects from the school's list."
        )
      }
    }
    await tx.execute(sql`
      delete from school_setup.arm_subjects
      where arm_id = ${input.armId} and not (subject_id = any(${sql.param(wanted)}::uuid[]))`)
    if (added.length > 0) {
      await tx.execute(sql`
        insert into school_setup.arm_subjects (tenant_id, arm_id, subject_id)
        select ${tenantId}, ${input.armId}, unnest(${sql.param(added)}::uuid[])`)
    }
    const after = [...wanted].sort()
    if (had.join() !== after.join()) {
      await recordAudit(tx, ctx, {
        action: "class_arm.subjects_changed",
        entityType: "class_arm",
        entityId: input.armId,
        changes: { subjectIds: { before: had, after } },
      })
    }
    const limits = limitsFor(arm)
    return {
      count: wanted.length,
      limits,
      warning: subjectCountWarning(wanted.length, limits),
    }
  })
}

/** A code no other subject uses: the preset's, or it with a number added. */
function freeCode(code: string, taken: Set<string>): string {
  if (!taken.has(code)) return code
  for (let suffix = 2; suffix < 100; suffix++) {
    const candidate = `${code.slice(0, 6)}${String(suffix)}`
    if (!taken.has(candidate)) return candidate
  }
  throw ValidationError.of("", "Too many subjects share this code.")
}

/**
 * Fills every arm that has no subjects yet from the NERDC preset for its standard class,
 * curriculum and field. A preset subject the school already has (by its NERDC key) is
 * reused, so renaming one keeps it linked.
 */
export async function applySubjectPresets(
  ctx: RequestContext
): Promise<{ arms: number; subjectsCreated: number }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  return withTenant(ctx.db, tenantId, async (tx) => {
    const arms = await tx.execute(sql`
      select a.id, a.curriculum, a.track, c.standard_class
      from school_setup.class_arms a join school_setup.classes c on c.id = a.class_id
      where a.archived_at is null and c.archived_at is null
        and not exists (select 1 from school_setup.arm_subjects s where s.arm_id = a.id)
      for update of a`)
    const subjects = await tx.execute(sql`
      select id, name, code, nerdc_key, archived_at from school_setup.subjects`)
    const byKey = new Map<string, string>()
    const byName = new Map<string, string>()
    const codes = new Set<string>()
    for (const row of subjects.rows) {
      codes.add(String(row.code))
      if (row.archived_at !== null) continue
      byName.set(String(row.name).toLowerCase(), String(row.id))
      if (row.nerdc_key !== null)
        byKey.set(asText(row.nerdc_key), String(row.id))
    }

    // Every new subject first, so the cap is checked once.
    const needed = new Map<string, schoolSetup.PresetSubject>()
    const plans = arms.rows.map((arm) => {
      const presets = schoolSetup.presetSubjects(
        (arm.standard_class ?? null) as schoolSetup.StandardClassKey | null,
        arm.curriculum as schoolSetup.CurriculumVersion,
        (arm.track ?? null) as schoolSetup.Track | null
      )
      for (const preset of presets) {
        if (byKey.has(preset.key)) continue
        // A subject the school made itself with the same name stands in for the preset.
        const sameName = byName.get(preset.name.toLowerCase())
        if (sameName !== undefined) byKey.set(preset.key, sameName)
        else needed.set(preset.key, preset)
      }
      return {
        armId: String(arm.id),
        keys: presets.map((preset) => preset.key),
      }
    })
    await checkCap(
      tx,
      "subjects",
      SETUP_LIMITS.subjects,
      needed.size,
      "subjects"
    )
    for (const preset of needed.values()) {
      const code = freeCode(preset.code, codes)
      codes.add(code)
      const inserted = await tx.execute(sql`
        insert into school_setup.subjects (tenant_id, name, code, kind, nerdc_key)
        values (${tenantId}, ${preset.name}, ${code}, ${preset.kind}, ${preset.key})
        on conflict do nothing
        returning id`)
      const id = inserted.rows[0]?.id
      if (id !== undefined) byKey.set(preset.key, asText(id))
    }

    let filled = 0
    for (const plan of plans) {
      const ids = plan.keys.flatMap((key) => {
        const id = byKey.get(key)
        return id === undefined ? [] : [id]
      })
      if (ids.length === 0) continue
      await tx.execute(sql`
        insert into school_setup.arm_subjects (tenant_id, arm_id, subject_id)
        select ${tenantId}, ${plan.armId}, unnest(${sql.param(ids)}::uuid[])
        on conflict do nothing`)
      filled++
    }
    if (filled > 0 || needed.size > 0) {
      await recordAudit(tx, ctx, {
        action: "subjects.presets_applied",
        entityType: "school_setup",
        entityId: tenantId,
        changes: {
          armsFilled: { before: 0, after: filled },
          subjectsCreated: { before: null, after: [...needed.keys()] },
        },
      })
    }
    return { arms: filled, subjectsCreated: needed.size }
  })
}
