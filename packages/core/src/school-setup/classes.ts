// Levels, classes and arms, step 4 (spec: docs/specs/stage-2-school-setup-a.md,
// section 5). Removing a class or arm archives it: nothing uses them yet, but later
// students and results will, and an archived row keeps them linked.
import type { z } from "zod"

import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import { schoolSetup } from "@akoso/domain"
import {
  SETUP_LIMITS,
  type moveClassInput,
  type saveArmInput,
  type saveClassInput,
  type setupRefInput,
} from "@akoso/schemas/school-setup"

import { diffForAudit, recordAudit } from "../audit/index"
import {
  authorize,
  NotFoundError,
  requireTenant,
  schoolToday,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import { checkCap, checkVersion, uniqueViolationOf, versionOf } from "./shared"

type Stage = schoolSetup.Stage

/**
 * The level for a stage, created the first time the school needs it. The upsert also
 * locks the level's row until the transaction ends, so changes to one level's classes
 * (new positions, moves) happen one at a time and never share a position.
 */
async function levelFor(
  tx: TenantTransaction,
  tenantId: string,
  stage: Stage
): Promise<string> {
  const order = Object.keys(schoolSetup.STAGE_LABELS).indexOf(stage) + 1
  const result = await tx.execute(sql`
    insert into school_setup.levels (tenant_id, name, stage, position)
    values (${tenantId}, ${schoolSetup.STAGE_LABELS[stage]}, ${stage}, ${order})
    on conflict (tenant_id, stage) do update set stage = excluded.stage
    returning id`)
  return String(result.rows[0]?.id)
}

/** The year the session for new arms starts: the current session's, or this school year's. */
async function sessionStartYear(
  tx: TenantTransaction,
  ctx: RequestContext
): Promise<number> {
  const current = await tx.execute(sql`
    select extract(year from starts_on)::int as year
    from school_setup.academic_sessions where status = 'current'`)
  const year = current.rows[0]?.year
  if (year !== undefined) return Number(year)
  const today = schoolToday(ctx)
  const calendarYear = Number(today.slice(0, 4))
  // Nigerian sessions start in September.
  return Number(today.slice(5, 7)) >= 9 ? calendarYear : calendarYear - 1
}

function nameTaken(error: unknown, name: string): never {
  const constraint = uniqueViolationOf(error)
  if (constraint === "classes_tenant_name_live") {
    throw ValidationError.of("name", `There's already a class called ${name}.`)
  }
  if (constraint === "class_arms_tenant_class_name_live") {
    throw ValidationError.of(
      "name",
      `This class already has an arm called ${name}.`
    )
  }
  throw error
}

/**
 * The classes a school of its type starts with, each with arm A on the curriculum its
 * pupils follow this session. Classes it already has (by standard class) are skipped.
 */
export async function createDefaultClasses(
  ctx: RequestContext
): Promise<{ created: number }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  return withTenant(ctx.db, tenantId, async (tx) => {
    const profile = await tx.execute(
      sql`select school_types from school_setup.school_profiles`
    )
    const types = (profile.rows[0]?.school_types ??
      []) as schoolSetup.SchoolType[]
    if (types.length === 0) {
      throw ValidationError.of(
        "",
        "Say what the school teaches in the school profile first."
      )
    }
    const existing = await tx.execute(sql`
      select standard_class from school_setup.classes
      where archived_at is null and standard_class is not null`)
    const have = new Set(existing.rows.map((row) => String(row.standard_class)))
    const wanted = schoolSetup
      .defaultClasses(types)
      .filter((entry) => !have.has(entry.key))
    if (wanted.length === 0) return { created: 0 }
    await checkCap(
      tx,
      "classes",
      SETUP_LIMITS.classes,
      wanted.length,
      "classes"
    )
    await checkCap(tx, "class_arms", SETUP_LIMITS.arms, wanted.length, "arms")
    const year = await sessionStartYear(tx, ctx)

    const created: string[] = []
    for (const entry of wanted) {
      const levelId = await levelFor(tx, tenantId, entry.stage)
      const position =
        schoolSetup.STANDARD_CLASSES.findIndex((c) => c.key === entry.key) + 1
      try {
        await tx.execute(sql`savepoint default_class`)
        const inserted = await tx.execute(sql`
          insert into school_setup.classes (tenant_id, level_id, name, standard_class, position)
          values (${tenantId}, ${levelId}, ${entry.label}, ${entry.key}, ${position})
          returning id`)
        await tx.execute(sql`
          insert into school_setup.class_arms (tenant_id, class_id, name, curriculum)
          values (${tenantId}, ${String(inserted.rows[0]?.id)}, 'A',
                  ${schoolSetup.defaultCurriculum(entry.key, year)})`)
        await tx.execute(sql`release savepoint default_class`)
        created.push(entry.label)
      } catch (error) {
        // A class of the same name the school made itself: keep theirs.
        if (uniqueViolationOf(error) !== "classes_tenant_name_live") throw error
        await tx.execute(sql`rollback to savepoint default_class`)
      }
    }
    await recordAudit(tx, ctx, {
      action: "classes.defaults_created",
      entityType: "school_setup",
      entityId: tenantId,
      changes: { classes: { before: null, after: created } },
    })
    return { created: created.length }
  })
}

export async function saveClass(
  ctx: RequestContext,
  input: z.output<typeof saveClassInput>
): Promise<{ id: string; version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  if (
    input.standardClass !== null &&
    schoolSetup.stageOfClass(input.standardClass) !== input.stage
  ) {
    throw ValidationError.of(
      "standardClass",
      "That standard class belongs to a different level."
    )
  }
  try {
    return await withTenant(ctx.db, tenantId, async (tx) => {
      const levelId = await levelFor(tx, tenantId, input.stage)
      let before: Record<string, unknown> | null = null
      if (input.id !== undefined) {
        const found = await tx.execute(sql`
          select c.id, c.name, c.standard_class, c.updated_at, l.stage
          from school_setup.classes c join school_setup.levels l on l.id = c.level_id
          where c.id = ${input.id} and c.archived_at is null for update of c`)
        before = found.rows[0] ?? null
        if (before === null) throw new NotFoundError()
        checkVersion(before.updated_at, input.version)
      } else {
        await checkCap(tx, "classes", SETUP_LIMITS.classes, 1, "classes")
      }
      const result =
        before === null
          ? await tx.execute(sql`
              insert into school_setup.classes (tenant_id, level_id, name, standard_class, position)
              values (${tenantId}, ${levelId}, ${input.name}, ${input.standardClass},
                      (select coalesce(max(position), 0) + 1 from school_setup.classes
                       where level_id = ${levelId}))
              returning id, updated_at`)
          : await tx.execute(sql`
              update school_setup.classes
              set name = ${input.name}, standard_class = ${input.standardClass},
                  level_id = ${levelId}, updated_at = now(),
                  position = case when level_id = ${levelId} then position else
                    (select coalesce(max(position), 0) + 1 from school_setup.classes
                     where level_id = ${levelId}) end
              where id = ${String(before.id)}
              returning id, updated_at`)
      const id = String(result.rows[0]?.id)
      await recordAudit(tx, ctx, {
        action: before === null ? "class.created" : "class.changed",
        entityType: "class",
        entityId: id,
        changes: diffForAudit(
          before === null
            ? null
            : {
                name: before.name,
                stage: before.stage,
                standardClass: before.standard_class,
              },
          {
            name: input.name,
            stage: input.stage,
            standardClass: input.standardClass,
          }
        ),
      })
      return { id, version: versionOf(result.rows[0]?.updated_at) }
    })
  } catch (error) {
    return nameTaken(error, input.name)
  }
}

/** Moves a class one place up or down within its level. */
export async function moveClass(
  ctx: RequestContext,
  input: z.output<typeof moveClassInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    // Lock the level first, so two moves in one level queue instead of each holding
    // one class and waiting for the other (a deadlock; review of PR #39, finding 1).
    const level = await tx.execute(sql`
      select l.id from school_setup.levels l
      join school_setup.classes c on c.level_id = l.id
      where c.id = ${input.id} and c.archived_at is null
      for update of l`)
    if (level.rows[0] === undefined) throw new NotFoundError()
    const found = await tx.execute(sql`
      select id, level_id, position from school_setup.classes
      where id = ${input.id} and archived_at is null for update`)
    const row = found.rows[0]
    if (row === undefined) throw new NotFoundError()
    const neighbour = await tx.execute(
      input.direction === "up"
        ? sql`select id, position from school_setup.classes
              where level_id = ${String(row.level_id)} and archived_at is null
                and position < ${Number(row.position)}
              order by position desc limit 1 for update`
        : sql`select id, position from school_setup.classes
              where level_id = ${String(row.level_id)} and archived_at is null
                and position > ${Number(row.position)}
              order by position limit 1 for update`
    )
    const other = neighbour.rows[0]
    if (other === undefined) return
    await tx.execute(sql`
      update school_setup.classes set position = ${Number(other.position)}, updated_at = now()
      where id = ${input.id}`)
    await tx.execute(sql`
      update school_setup.classes set position = ${Number(row.position)}, updated_at = now()
      where id = ${String(other.id)}`)
    await recordAudit(tx, ctx, {
      action: "class.moved",
      entityType: "class",
      entityId: input.id,
      changes: {
        position: {
          before: Number(row.position),
          after: Number(other.position),
        },
      },
    })
  })
}

/** Archives a class and its arms. */
export async function removeClass(
  ctx: RequestContext,
  input: z.output<typeof setupRefInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      update school_setup.classes set archived_at = now(), updated_at = now()
      where id = ${input.id} and archived_at is null returning name`)
    if (result.rows[0] === undefined) throw new NotFoundError()
    const arms = await tx.execute(sql`
      update school_setup.class_arms set archived_at = now(), updated_at = now()
      where class_id = ${input.id} and archived_at is null returning id`)
    await recordAudit(tx, ctx, {
      action: "class.archived",
      entityType: "class",
      entityId: input.id,
      changes: {
        archived: { before: false, after: true },
        // The arms archived with it (review of PR #39, finding 7).
        armsArchived: {
          before: null,
          after: arms.rows.map((arm) => String(arm.id)).sort(),
        },
      },
    })
  })
}

export async function saveArm(
  ctx: RequestContext,
  input: z.output<typeof saveArmInput>
): Promise<{ id: string; version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  try {
    return await withTenant(ctx.db, tenantId, async (tx) => {
      const parent = await tx.execute(sql`
        select l.stage from school_setup.classes c
        join school_setup.levels l on l.id = c.level_id
        where c.id = ${input.classId} and c.archived_at is null`)
      const stage = parent.rows[0]?.stage
      if (stage === undefined) throw new NotFoundError()
      if (input.track !== null && stage !== "senior") {
        throw ValidationError.of(
          "track",
          "Only senior secondary arms have a field of study."
        )
      }
      if (input.track === "technology" && input.curriculum === "nerdc_2025") {
        throw ValidationError.of(
          "track",
          "Technology is a field only in the curriculum before 2025."
        )
      }
      let before: Record<string, unknown> | null = null
      if (input.id !== undefined) {
        const found = await tx.execute(sql`
          select id, class_id, name, curriculum, track, updated_at from school_setup.class_arms
          where id = ${input.id} and archived_at is null for update`)
        before = found.rows[0] ?? null
        if (before === null) throw new NotFoundError()
        checkVersion(before.updated_at, input.version)
      } else {
        await checkCap(tx, "class_arms", SETUP_LIMITS.arms, 1, "arms")
      }
      const result =
        before === null
          ? await tx.execute(sql`
              insert into school_setup.class_arms (tenant_id, class_id, name, curriculum, track)
              values (${tenantId}, ${input.classId}, ${input.name}, ${input.curriculum}, ${input.track})
              returning id, updated_at`)
          : await tx.execute(sql`
              update school_setup.class_arms
              set class_id = ${input.classId}, name = ${input.name},
                  curriculum = ${input.curriculum}, track = ${input.track}, updated_at = now()
              where id = ${String(before.id)}
              returning id, updated_at`)
      const id = String(result.rows[0]?.id)
      await recordAudit(tx, ctx, {
        action: before === null ? "class_arm.created" : "class_arm.changed",
        entityType: "class_arm",
        entityId: id,
        changes: diffForAudit(
          before === null
            ? null
            : {
                classId: before.class_id,
                name: before.name,
                curriculum: before.curriculum,
                track: before.track,
              },
          {
            classId: input.classId,
            name: input.name,
            curriculum: input.curriculum,
            track: input.track,
          }
        ),
      })
      return { id, version: versionOf(result.rows[0]?.updated_at) }
    })
  } catch (error) {
    return nameTaken(error, input.name)
  }
}

export async function removeArm(
  ctx: RequestContext,
  input: z.output<typeof setupRefInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  await withTenant(ctx.db, tenantId, async (tx) => {
    const result = await tx.execute(sql`
      update school_setup.class_arms set archived_at = now(), updated_at = now()
      where id = ${input.id} and archived_at is null returning id`)
    if (result.rows[0] === undefined) throw new NotFoundError()
    await recordAudit(tx, ctx, {
      action: "class_arm.archived",
      entityType: "class_arm",
      entityId: input.id,
      changes: { archived: { before: false, after: true } },
    })
  })
}
