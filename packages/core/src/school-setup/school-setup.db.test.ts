// School setup part A against the local database (spec:
// docs/specs/stage-2-school-setup-a.md, acceptance criteria 2 to 6 and 8). Each test
// makes its own school, so nothing depends on the seed. Run with `pnpm test:db`.
import { randomUUID } from "node:crypto"

import { afterAll, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"
import { permissionsFor, type RoleKey } from "@akoso/schemas/permissions"
import {
  addNonSchoolDayInput,
  saveProfileInput,
  saveTermsInput,
} from "@akoso/schemas/school-setup"

import {
  ConflictError,
  createLogger,
  ForbiddenError,
  ValidationError,
  type RequestContext,
} from "../kernel/index"
import {
  addNonSchoolDay,
  applySubjectPresets,
  confirmHolidays,
  createDefaultClasses,
  getSchoolSetup,
  isSchoolDay,
  makeSessionCurrent,
  moveClass,
  removeClass,
  saveArm,
  saveSchoolProfile,
  saveSession,
  saveTerms,
  setArmSubjects,
} from "./index"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"

const app = createDatabase(APP_URL, 4)
const owner = createDatabase(OWNER_URL, 1)
afterAll(async () => {
  await app.close()
  await owner.close()
})

interface School {
  id: string
  slug: string
  name: string
}

async function newSchool(): Promise<School> {
  const id = randomUUID()
  const school = {
    id,
    slug: `setup-${id.slice(0, 8)}`,
    name: `Setup School ${id.slice(0, 6)}`,
  }
  await owner.db.execute(sql`
    insert into platform.tenants (id, slug, name, status)
    values (${id}, ${school.slug}, ${school.name}, 'onboarding')`)
  return school
}

/** A context for someone holding these roles in the school (no real sign-in needed). */
function as(
  school: School,
  roles: RoleKey[],
  today = "2026-11-14"
): RequestContext {
  const now = new Date(`${today}T09:00:00Z`)
  return {
    requestId: `req_test_${randomUUID().slice(0, 8)}`,
    tenantId: school.id,
    school: {
      id: school.id,
      slug: school.slug,
      name: school.name,
      status: "onboarding",
      timeZone: "Africa/Lagos",
    },
    db: app.db,
    now: () => now,
    log: createLogger({}, () => undefined),
    actor: {
      kind: "user",
      userId: randomUUID(),
      roles,
      permissions: permissionsFor(roles),
    },
  }
}

const profile = (
  school: School,
  extra: Partial<Record<string, unknown>> = {}
) =>
  saveProfileInput.parse({
    school: school.slug,
    name: school.name,
    schoolTypes: ["primary"],
    address: "12 Unity Road, Ikeja",
    state: "Lagos",
    phone: "0803 123 4567",
    ...extra,
  })

async function auditCount(school: School, action: string): Promise<number> {
  const result = await owner.db.execute(sql`
    select count(*)::int as n from platform.audit_events
    where tenant_id = ${school.id} and action = ${action}`)
  return Number(result.rows[0]?.n ?? 0)
}

async function primarySchool(
  sessionName: string,
  startsOn: string,
  endsOn: string
) {
  const school = await newSchool()
  const ctx = as(school, ["proprietor"])
  await saveSchoolProfile(ctx, profile(school))
  const session = await saveSession(ctx, {
    school: school.slug,
    name: sessionName,
    startsOn,
    endsOn,
  })
  await createDefaultClasses(ctx)
  await applySubjectPresets(ctx)
  return { school, ctx, session }
}

describe("school setup part A", () => {
  it("lets every staff role read the set-up, and only managers change it", async () => {
    const school = await newSchool()
    const teacher = as(school, ["teacher"])
    await expect(getSchoolSetup(teacher)).resolves.toBeDefined()
    await expect(
      saveSchoolProfile(teacher, profile(school))
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      getSchoolSetup(as(school, ["guardian"]))
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it("saves the profile, with the name and time zone on the school", async () => {
    const school = await newSchool()
    const ctx = as(school, ["school_admin"])
    const renamed = `${school.name} Academy`
    await saveSchoolProfile(ctx, profile(school, { name: renamed }))
    const setup = await getSchoolSetup(ctx)
    expect(setup.profile.name).toBe(renamed)
    expect(setup.profile.phone).toBe("+2348031234567")
    expect(await auditCount(school, "school_profile.created")).toBe(1)

    await expect(
      saveSchoolProfile(ctx, profile(school, { brandColour: "#fde047" }))
    ).rejects.toBeInstanceOf(ValidationError)
    // A save based on an older version is a conflict (two people editing).
    await saveSchoolProfile(
      ctx,
      profile(school, { motto: "Light", version: setup.profile.version })
    )
    await expect(
      saveSchoolProfile(
        ctx,
        profile(school, { motto: "Stale", version: setup.profile.version })
      )
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("creates Primary 1 to 6 with arm A and fills each from its NERDC preset (criteria 2, 3)", async () => {
    const { ctx } = await primarySchool("2025/2026", "2025-09-08", "2026-07-24")
    const setup = await getSchoolSetup(ctx)
    expect(setup.classes.map((entry) => entry.name)).toEqual([
      "Primary 1",
      "Primary 2",
      "Primary 3",
      "Primary 4",
      "Primary 5",
      "Primary 6",
    ])
    const arm = (name: string) => {
      const found = setup.classes.find((entry) => entry.name === name)?.arms[0]
      if (found === undefined) throw new Error(`no arm for ${name}`)
      return found
    }
    // In 2025/2026, Primary 4 is on the 2025 curriculum and Primary 6 is not.
    expect(arm("Primary 4").curriculum).toBe("nerdc_2025")
    expect(arm("Primary 6").curriculum).toBe("nerdc_pre2025")
    const keys = (name: string) =>
      arm(name).subjectIds.map(
        (id) => setup.subjects.find((subject) => subject.id === id)?.nerdcKey
      )
    expect(keys("Primary 4")).toContain("nigerian_history")
    expect(keys("Primary 6")).not.toContain("nigerian_history")
    expect(keys("Primary 6")).toContain("religion_national_values")
    expect(setup.checklist.find((step) => step.key === "subjects")?.state).toBe(
      "done"
    )

    // Running the defaults again adds nothing twice.
    expect(await createDefaultClasses(ctx)).toEqual({ created: 0 })
  })

  it("warns, and still saves, when a 2025 arm is outside NERDC's range (criterion 4)", async () => {
    const { ctx, school } = await primarySchool(
      "2025/2026",
      "2025-09-08",
      "2026-07-24"
    )
    const setup = await getSchoolSetup(ctx)
    const p4 = setup.classes.find(
      (entry) => entry.standardClass === "primary_4"
    )?.arms[0]
    if (p4 === undefined) throw new Error("no Primary 4 arm")
    const ids = setup.subjects.map((subject) => subject.id)
    expect(ids.length).toBeGreaterThanOrEqual(14)
    const many = await setArmSubjects(ctx, {
      school: school.slug,
      armId: p4.id,
      subjectIds: ids.slice(0, 14),
    })
    expect(many.count).toBe(14)
    expect(many.warning).toMatch(/11 to 13/)
    const fine = await setArmSubjects(ctx, {
      school: school.slug,
      armId: p4.id,
      subjectIds: ids.slice(0, 12),
    })
    expect(fine.warning).toBeNull()
    expect(await auditCount(school, "class_arm.subjects_changed")).toBe(2)
  })

  it("refuses bad term dates in plain words, and counts school days by hand (criterion 5)", async () => {
    const school = await newSchool()
    const ctx = as(school, ["proprietor"])
    const session = await saveSession(ctx, {
      school: school.slug,
      name: "2026/2027",
      startsOn: "2026-09-07",
      endsOn: "2027-07-23",
    })
    const terms = (list: unknown[]) =>
      saveTermsInput.parse({
        school: school.slug,
        sessionId: session.id,
        terms: list,
      })
    const first = { number: 1, startsOn: "2026-09-07", endsOn: "2026-12-11" }

    const refused = async (list: unknown[]) => {
      const error = await saveTerms(ctx, terms(list)).catch(
        (caught: unknown) => caught
      )
      expect(error).toBeInstanceOf(ValidationError)
      return (error as ValidationError).fieldErrors.map(
        (field) => field.message
      )
    }
    expect(
      await refused([
        first,
        { number: 2, startsOn: "2026-12-01", endsOn: "2027-03-26" },
      ])
    ).toContain("Term 2 must start after term 1 ends.")
    expect(
      await refused([
        {
          ...first,
          midTermStartsOn: "2026-12-14",
          midTermEndsOn: "2026-12-15",
        },
      ])
    ).toContain("The mid-term break must fall inside the term.")
    expect(await refused([{ ...first, resumesOn: "2026-12-01" }])).toContain(
      "Resumption must come after the term ends."
    )

    // 7 to 18 September 2026: ten weekdays; a three-day mid-term; a Monday holiday.
    await saveTerms(
      ctx,
      terms([
        {
          number: 1,
          startsOn: "2026-09-07",
          endsOn: "2026-09-18",
          midTermStartsOn: "2026-09-15",
          midTermEndsOn: "2026-09-17",
          resumesOn: "2026-09-28",
        },
      ])
    )
    await addNonSchoolDay(
      ctx,
      addNonSchoolDayInput.parse({
        school: school.slug,
        startsOn: "2026-09-14",
        endsOn: "2026-09-14",
        reason: "closure",
      })
    )
    const setup = await getSchoolSetup(ctx)
    expect(setup.current?.terms[0]?.schoolDays).toBe(6)
    expect(await isSchoolDay(ctx, "2026-09-14" as never)).toBe(false)
    expect(await isSchoolDay(ctx, "2026-09-18" as never)).toBe(true)
    expect(await auditCount(school, "terms.changed")).toBe(1)
  })

  it("adds suggested holidays only when confirmed, once (criterion 6)", async () => {
    const school = await newSchool()
    const ctx = as(school, ["proprietor"])
    await saveSession(ctx, {
      school: school.slug,
      name: "2026/2027",
      startsOn: "2026-09-07",
      endsOn: "2027-07-23",
    })
    const before = await getSchoolSetup(ctx)
    expect(before.nonSchoolDays).toEqual([])
    expect(before.suggestedHolidays.map((holiday) => holiday.name)).toContain(
      "Independence Day"
    )
    const independence = before.suggestedHolidays.filter(
      (holiday) => holiday.name === "Independence Day"
    )
    expect(
      await confirmHolidays(ctx, {
        school: school.slug,
        holidays: independence,
      })
    ).toEqual({
      added: 1,
    })
    expect(
      await confirmHolidays(ctx, {
        school: school.slug,
        holidays: independence,
      })
    ).toEqual({
      added: 0,
    })
    const after = await getSchoolSetup(ctx)
    expect(after.nonSchoolDays).toHaveLength(1)
    expect(
      after.suggestedHolidays.map((holiday) => holiday.name)
    ).not.toContain("Independence Day")
  })

  it("keeps one current session when two are made at once", async () => {
    const school = await newSchool()
    const ctx = as(school, ["proprietor"])
    const results = await Promise.allSettled(
      ["2026/2027", "2027/2028"].map((name, index) =>
        saveSession(ctx, {
          school: school.slug,
          name,
          startsOn: `${String(2026 + index)}-09-07`,
          endsOn: `${String(2027 + index)}-07-23`,
        })
      )
    )
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(ConflictError)
      }
    }
    const setup = await getSchoolSetup(ctx)
    expect(
      setup.sessions.filter((session) => session.status === "current")
    ).toHaveLength(1)
    // Asking again for a session that is already current changes nothing.
    const current = setup.current
    if (current === null) throw new Error("no current session")
    await makeSessionCurrent(ctx, {
      school: school.slug,
      sessionId: current.id,
    })
  })

  it("refuses a version that isn't a time, before any database work", () => {
    expect(
      saveProfileInput.safeParse({
        school: "greenfield",
        name: "Greenfield",
        schoolTypes: ["primary"],
        version: "not-a-date",
      }).success
    ).toBe(false)
  })

  it("keeps arm rules and archives a removed class", async () => {
    const { ctx, school } = await primarySchool(
      "2026/2027",
      "2026-09-07",
      "2027-07-23"
    )
    const setup = await getSchoolSetup(ctx)
    const p1 = setup.classes[0]
    if (p1 === undefined) throw new Error("no class")
    await expect(
      saveArm(ctx, {
        school: school.slug,
        classId: p1.id,
        name: "B",
        curriculum: "nerdc_2025",
        track: "science",
      })
    ).rejects.toBeInstanceOf(ValidationError)
    const duplicate = await saveArm(ctx, {
      school: school.slug,
      classId: p1.id,
      name: "a",
      curriculum: "nerdc_2025",
      track: null,
    }).catch((caught: unknown) => caught)
    expect((duplicate as ValidationError).fieldErrors[0]?.message).toBe(
      "This class already has an arm called a."
    )
    // Two opposite moves at once queue on the level instead of deadlocking.
    const [first, second] = setup.classes
    if (first === undefined || second === undefined)
      throw new Error("no classes")
    await Promise.all([
      moveClass(ctx, { school: school.slug, id: first.id, direction: "down" }),
      moveClass(ctx, { school: school.slug, id: second.id, direction: "up" }),
    ])

    await removeClass(ctx, { school: school.slug, id: p1.id })
    const archived = await owner.db.execute(sql`
      select changes from platform.audit_events
      where tenant_id = ${school.id} and action = 'class.archived'`)
    const changes = archived.rows[0]?.changes as {
      armsArchived?: { after: string[] }
    }
    expect(changes.armsArchived?.after).toEqual(p1.arms.map((arm) => arm.id))
    const after = await getSchoolSetup(ctx)
    expect(after.classes.map((entry) => entry.id)).not.toContain(p1.id)
    expect(await auditCount(school, "class.archived")).toBe(1)
  })
})
