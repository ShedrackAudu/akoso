// Sessions and terms, step 2 (spec: docs/specs/stage-2-school-setup-a.md, section 3).
// One session is current; the next can be prepared ahead. A closed session is
// read-only. Rollover (closing one and opening the next) is its own Stage 2 item.
import type { z } from "zod"

import { sql, withTenant, type TenantTransaction } from "@akoso/db"
import { schoolSetup, type time } from "@akoso/domain"
import type {
  saveSessionInput,
  saveTermsInput,
  sessionRefInput,
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
  checkVersion,
  touchSession,
  changedElsewhere,
  ONE_CURRENT_SESSION,
  uniqueViolationOf,
  versionOf,
} from "./shared"

type LocalDate = time.LocalDate

async function lockSession(
  tx: TenantTransaction,
  id: string
): Promise<Record<string, unknown>> {
  const found = await tx.execute(sql`
    select id, name, starts_on::text, ends_on::text, status, updated_at
    from school_setup.academic_sessions where id = ${id} for update`)
  const row = found.rows[0]
  if (row === undefined) throw new NotFoundError()
  return row
}

function refuseClosed(row: Record<string, unknown>): void {
  if (row.status === "closed") {
    throw ValidationError.of(
      "",
      "This session is closed, so its dates can't change."
    )
  }
}

export async function saveSession(
  ctx: RequestContext,
  input: z.output<typeof saveSessionInput>
): Promise<{ id: string; version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  if (input.endsOn <= input.startsOn) {
    throw ValidationError.of("endsOn", "The session must end after it starts.")
  }
  const [first, second] = input.name.split("/").map(Number)
  if (second !== (first ?? 0) + 1) {
    throw ValidationError.of(
      "name",
      "Write the session as two years in a row, like 2026/2027"
    )
  }

  try {
    return await withTenant(ctx.db, tenantId, async (tx) => {
      let before: Record<string, unknown> | null = null
      if (input.id !== undefined) {
        before = await lockSession(tx, input.id)
        refuseClosed(before)
        checkVersion(before.updated_at, input.version)
        // Terms must still fit inside the new dates.
        const outside = await tx.execute(sql`
          select 1 from school_setup.terms where session_id = ${input.id}
            and (starts_on < ${input.startsOn}::date or ends_on > ${input.endsOn}::date)
          limit 1`)
        if (outside.rows.length > 0) {
          throw ValidationError.of(
            "",
            "Some terms fall outside these dates. Change the term dates first."
          )
        }
      }
      const hasCurrent = await tx.execute(sql`
        select 1 from school_setup.academic_sessions where status = 'current' limit 1`)
      const result =
        before === null
          ? await tx.execute(sql`
              insert into school_setup.academic_sessions
                (tenant_id, name, starts_on, ends_on, status)
              values (${tenantId}, ${input.name}, ${input.startsOn}, ${input.endsOn},
                      ${hasCurrent.rows.length === 0 ? "current" : "planned"})
              returning id, status, updated_at`)
          : await tx.execute(sql`
              update school_setup.academic_sessions
              set name = ${input.name}, starts_on = ${input.startsOn},
                  ends_on = ${input.endsOn}, updated_at = now()
              where id = ${String(before.id)}
              returning id, status, updated_at`)
      const row = result.rows[0]
      const id = String(row?.id)
      await recordAudit(tx, ctx, {
        action:
          before === null
            ? "academic_session.created"
            : "academic_session.changed",
        entityType: "academic_session",
        entityId: id,
        changes: diffForAudit(
          before === null
            ? null
            : {
                name: before.name,
                startsOn: before.starts_on,
                endsOn: before.ends_on,
              },
          {
            name: input.name,
            startsOn: input.startsOn,
            endsOn: input.endsOn,
            ...(before === null ? { status: row?.status } : {}),
          }
        ),
      })
      return { id, version: versionOf(row?.updated_at) }
    })
  } catch (error) {
    const constraint = uniqueViolationOf(error)
    if (constraint === "academic_sessions_tenant_name_unique") {
      throw ValidationError.of(
        "name",
        `There's already a session called ${input.name}.`
      )
    }
    if (constraint === ONE_CURRENT_SESSION) throw changedElsewhere()
    throw error
  }
}

/**
 * Makes a planned session current, when the school has none. Moving from one current
 * session to the next is rollover, its own item.
 */
export async function makeSessionCurrent(
  ctx: RequestContext,
  input: z.output<typeof sessionRefInput>
): Promise<void> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  try {
    await makeCurrent(ctx, tenantId, input.sessionId)
  } catch (error) {
    if (uniqueViolationOf(error) === ONE_CURRENT_SESSION)
      throw changedElsewhere()
    throw error
  }
}

async function makeCurrent(
  ctx: RequestContext,
  tenantId: string,
  sessionId: string
): Promise<void> {
  const input = { sessionId }
  await withTenant(ctx.db, tenantId, async (tx) => {
    const row = await lockSession(tx, input.sessionId)
    if (row.status === "current") return
    refuseClosed(row)
    const current = await tx.execute(sql`
      select name from school_setup.academic_sessions where status = 'current'`)
    if (current.rows.length > 0) {
      throw ValidationError.of(
        "",
        `${String(current.rows[0]?.name)} is the current session. Moving to the next session comes with rollover.`
      )
    }
    await tx.execute(sql`
      update school_setup.academic_sessions set status = 'current', updated_at = now()
      where id = ${input.sessionId}`)
    await recordAudit(tx, ctx, {
      action: "academic_session.made_current",
      entityType: "academic_session",
      entityId: input.sessionId,
      changes: { status: { before: row.status, after: "current" } },
    })
  })
}

type TermIn = z.output<typeof saveTermsInput>["terms"][number]

/** The problems with a session's terms, as field errors the form can show. */
function termErrors(
  session: { startsOn: string; endsOn: string },
  terms: readonly TermIn[]
): { path: string; message: string }[] {
  const errors: { path: string; message: string }[] = []
  const numbers = new Set<number>()
  terms.forEach((term, index) => {
    if (numbers.has(term.number)) {
      errors.push({
        path: `terms.${String(index)}.number`,
        message: `Term ${String(term.number)} is listed twice.`,
      })
    }
    numbers.add(term.number)
    if ((term.midTermStartsOn === null) !== (term.midTermEndsOn === null)) {
      errors.push({
        path: `terms.${String(index)}.midTermEndsOn`,
        message:
          "Give both the first and last day of the mid-term break, or neither.",
      })
    }
    if (term.startsOn < session.startsOn || term.endsOn > session.endsOn) {
      errors.push({
        path: `terms.${String(index)}.startsOn`,
        message: `Term ${String(term.number)} must fall inside the session's dates.`,
      })
    }
  })
  const indexOf = (number: number): number =>
    terms.findIndex((term) => term.number === number)
  for (const problem of schoolSetup.termProblems(
    terms.map((term) => ({
      number: term.number,
      startsOn: term.startsOn as LocalDate,
      endsOn: term.endsOn as LocalDate,
      midTerm:
        term.midTermStartsOn === null || term.midTermEndsOn === null
          ? null
          : {
              startsOn: term.midTermStartsOn as LocalDate,
              endsOn: term.midTermEndsOn as LocalDate,
            },
      resumesOn: term.resumesOn as LocalDate | null,
    }))
  )) {
    errors.push({
      path: `terms.${String(indexOf(problem.term))}`,
      message: problem.message,
    })
  }
  return errors
}

/** Saves a session's terms together, so their order can be checked as a whole. */
export async function saveTerms(
  ctx: RequestContext,
  input: z.output<typeof saveTermsInput>
): Promise<{ version: string }> {
  authorize(ctx, "setup.school.manage")
  const tenantId = requireTenant(ctx)
  return withTenant(ctx.db, tenantId, async (tx) => {
    const session = await lockSession(tx, input.sessionId)
    refuseClosed(session)
    checkVersion(session.updated_at, input.version)
    const errors = termErrors(
      { startsOn: String(session.starts_on), endsOn: String(session.ends_on) },
      input.terms
    )
    if (errors.length > 0) throw new ValidationError(errors, errors[0]?.message)

    const beforeRows = await tx.execute(sql`
      select number, starts_on::text, ends_on::text, mid_term_starts_on::text,
             mid_term_ends_on::text, resumes_on::text
      from school_setup.terms where session_id = ${input.sessionId} order by number`)
    const shape = (row: Record<string, unknown>) => ({
      startsOn: row.starts_on ?? row.startsOn,
      endsOn: row.ends_on ?? row.endsOn,
      midTermStartsOn: row.mid_term_starts_on ?? row.midTermStartsOn ?? null,
      midTermEndsOn: row.mid_term_ends_on ?? row.midTermEndsOn ?? null,
      resumesOn: row.resumes_on ?? row.resumesOn ?? null,
    })
    const before = Object.fromEntries(
      beforeRows.rows.map((row) => [`term${String(row.number)}`, shape(row)])
    )
    const after = Object.fromEntries(
      input.terms.map((term) => [`term${String(term.number)}`, shape(term)])
    )

    const kept = input.terms.map((term) => term.number)
    await tx.execute(sql`
      delete from school_setup.terms
      where session_id = ${input.sessionId} and not (number = any(${sql.param(kept)}::smallint[]))`)
    for (const term of input.terms) {
      await tx.execute(sql`
        insert into school_setup.terms
          (tenant_id, session_id, number, starts_on, ends_on, mid_term_starts_on,
           mid_term_ends_on, resumes_on)
        values (${tenantId}, ${input.sessionId}, ${String(term.number)}, ${term.startsOn},
                ${term.endsOn}, ${term.midTermStartsOn}, ${term.midTermEndsOn}, ${term.resumesOn})
        on conflict (tenant_id, session_id, number) do update set
          starts_on = excluded.starts_on, ends_on = excluded.ends_on,
          mid_term_starts_on = excluded.mid_term_starts_on,
          mid_term_ends_on = excluded.mid_term_ends_on,
          resumes_on = excluded.resumes_on, updated_at = now()`)
    }
    await touchSession(tx, input.sessionId)
    await recordAudit(tx, ctx, {
      action: "terms.changed",
      entityType: "academic_session",
      entityId: input.sessionId,
      changes: diffForAudit(before, after),
    })
    const fresh = await tx.execute(sql`
      select updated_at from school_setup.academic_sessions where id = ${input.sessionId}`)
    return { version: versionOf(fresh.rows[0]?.updated_at) }
  })
}
