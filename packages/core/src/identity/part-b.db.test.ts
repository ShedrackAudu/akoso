// Sign-in part B against the local database (spec: docs/specs/stage-1-sign-in-part-b.md,
// acceptance criteria 1 to 9). Each test makes its own school and people, so nothing
// depends on the seed or on another test. Run with `pnpm test:db`.
import { randomInt, randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"
import { email, sms } from "@akoso/providers"
import {
  permissionsFor,
  RESTRICTED_ACTIONS,
  type RoleKey,
} from "@akoso/schemas/permissions"

import {
  ReauthRequiredError,
  ValidationError,
  createLogger,
  type RequestContext,
} from "../kernel/index"
import { accessFor } from "./access"
import {
  confirmBackupPhone,
  confirmEmailChange,
  deleteMyAccount,
  requestBackupPhone,
  requestEmailChange,
} from "./account"
import { setIdentityServices } from "./instance"
import { changeMemberRoles, listMembers, setMembershipStatus } from "./members"
import {
  confirmNumberChange,
  resetMemberMfa,
  startNumberChange,
} from "./recovery"
import { saveCustomRole } from "./roles"
import { accessReview, accessReviewCsv, readSecurityLog } from "./security-log"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
// Superuser, straight to Postgres: makes schools and people, and checks results.
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"

const app = createDatabase(APP_URL, 4)
const owner = createDatabase(OWNER_URL, 1)
const fakeSms = sms.createFakeSmsProvider({ baseDomain: "akoso.localhost" })
const fakeEmail = email.createFakeEmailProvider({
  baseDomain: "akoso.localhost",
})

beforeAll(() => {
  setIdentityServices({
    sms: fakeSms,
    email: fakeEmail,
    hashKey: "test-only-hash-key-000000000000000000000",
    baseDomain: "akoso.localhost",
  })
})
afterAll(async () => {
  await app.close()
  await owner.close()
})

const ownerRun = (query: ReturnType<typeof sql>) => owner.db.execute(query)

async function newSchool(): Promise<{ id: string; name: string }> {
  const id = randomUUID()
  const name = `Part B School ${id.slice(0, 6)}`
  await ownerRun(sql`
    insert into platform.tenants (id, slug, name, status)
    values (${id}, ${`partb-${id.slice(0, 8)}`}, ${name}, 'active')`)
  return { id, name }
}

const newPhone = () => `+234803${String(randomInt(1_000_000, 9_999_999))}`

interface Person {
  userId: string
  membershipId: string
  phone: string
}

async function newPerson(
  schoolId: string,
  roles: RoleKey[],
  options: { mfa?: boolean; email?: string } = {}
): Promise<Person> {
  const userId = randomUUID()
  const phone = newPhone()
  await ownerRun(sql`
    insert into platform.users (id, name, email, phone_number, two_factor_enabled)
    values (${userId}, ${`Person ${userId.slice(0, 6)}`},
            ${options.email ?? `${userId}@people.invalid`}, ${phone},
            ${options.mfa === true})`)
  if (options.mfa === true) {
    await ownerRun(sql`
      insert into platform.two_factors (id, secret, backup_codes, user_id)
      values (${randomUUID()}, 'encrypted-secret', 'encrypted-codes', ${userId})`)
  }
  const membershipId = await join(schoolId, userId, roles)
  return { userId, membershipId, phone }
}

async function join(
  schoolId: string,
  userId: string,
  roles: RoleKey[]
): Promise<string> {
  const result = await ownerRun(sql`
    insert into platform.memberships (tenant_id, user_id, roles)
    values (${schoolId}, ${userId}, ${sql.param(roles)}::text[]) returning id`)
  return String(result.rows[0]?.id)
}

/** A context for a person in a school, built the way sign-in builds it. */
async function as(
  person: Person,
  school: { id: string; name: string } | null,
  options: { signedInMinutesAgo?: number } = {}
): Promise<RequestContext> {
  const access = await accessFor(app.db, person.userId)
  const membership =
    school === null
      ? null
      : (access.schools.find(
          (candidate) => candidate.school.id === school.id
        ) ?? null)
  const roles = membership?.roles ?? [...access.roles]
  const now = new Date()
  return {
    requestId: `req_test_${randomUUID().slice(0, 8)}`,
    tenantId: membership?.school.id ?? null,
    school: membership?.school ?? null,
    db: app.db,
    now: () => now,
    log: createLogger({}, () => undefined),
    actor: {
      kind: "user",
      userId: person.userId,
      roles,
      permissions: permissionsFor(roles, membership?.customPermissions ?? []),
      signedInAt: new Date(
        now.getTime() - (options.signedInMinutesAgo ?? 1) * 60 * 1000
      ),
    },
  }
}

async function addSession(userId: string): Promise<void> {
  await ownerRun(sql`
    insert into platform.sessions (id, expires_at, token, user_id)
    values (${randomUUID()}, now() + interval '1 day', ${randomUUID()}, ${userId})`)
}

async function sessionsOf(userId: string): Promise<number> {
  const result = await ownerRun(
    sql`select count(*)::int as n from platform.sessions where user_id = ${userId}`
  )
  return Number(result.rows[0]?.n)
}

const codeIn = (message: string | undefined): string =>
  /(\d{6})/.exec(message ?? "")?.[1] ?? ""

const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => "accepted",
    (error: unknown) =>
      error instanceof ValidationError
        ? (error.fieldErrors[0]?.message ?? "validation")
        : error instanceof Error
          ? error.name
          : "unknown"
  )

describe("people with access (criteria 1 and 2)", () => {
  it("changes a teacher's roles: audited, logged for the school, signed out", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const teacher = await newPerson(school.id, ["teacher"])
    await addSession(teacher.userId)
    const ctx = await as(proprietor, school)

    const changed = await changeMemberRoles(ctx, {
      school: "x",
      membershipId: teacher.membershipId,
      roles: ["teacher", "head_teacher"],
      customRoleIds: [],
    })
    expect(changed.roles).toEqual(["head_teacher", "teacher"])
    expect(await sessionsOf(teacher.userId)).toBe(0)
    const audit = await ownerRun(sql`
      select action from platform.audit_events where tenant_id = ${school.id}`)
    expect(audit.rows.map((row) => row.action)).toContain(
      "membership.roles.changed"
    )
    const event = await ownerRun(sql`
      select caused_by_school_id from platform.security_events
      where user_id = ${teacher.userId} and kind = 'roles_changed'`)
    expect(event.rows[0]?.caused_by_school_id).toBe(school.id)
  })

  it("suspends a teacher, who then has no access to the school", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const teacher = await newPerson(school.id, ["teacher"])
    await setMembershipStatus(await as(proprietor, school), {
      school: "x",
      membershipId: teacher.membershipId,
      status: "suspended",
    })
    const access = await accessFor(app.db, teacher.userId)
    expect(access.schools.map((s) => s.school.id)).not.toContain(school.id)
  })

  it("enforces the rules against climbing privileges", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const admin = await newPerson(school.id, ["school_admin"], { mfa: true })
    const teacher = await newPerson(school.id, ["teacher"])
    const adminCtx = await as(admin, school)
    const change = (ctx: RequestContext, target: Person, roles: RoleKey[]) =>
      refusal(
        changeMemberRoles(ctx, {
          school: "x",
          membershipId: target.membershipId,
          roles,
          customRoleIds: [],
        })
      )

    // Rule 1: not your own.
    expect(await change(adminCtx, admin, ["school_admin", "bursar"])).toMatch(
      /your own access/
    )
    // Rule 2: only a proprietor makes an administrator.
    expect(
      await change(adminCtx, teacher, ["teacher", "school_admin"])
    ).toMatch(/Only a proprietor/)
    // Rule 3: an administrator can't give a custom role holding what they lack.
    const proprietorCtx = await as(proprietor, school)
    const role = await saveCustomRole(proprietorCtx, {
      school: "x",
      name: "Log reader",
      description: "",
      permissions: ["identity.security_log.read"],
      requiresMfa: false,
    })
    expect(
      await refusal(
        changeMemberRoles(adminCtx, {
          school: "x",
          membershipId: teacher.membershipId,
          roles: ["teacher"],
          customRoleIds: [role.id],
        })
      )
    ).toMatch(/permissions you have yourself/)
    // Rule 4: the last active proprietor stays, even in a race: here the acting
    // proprietor is suspended between loading the page and acting.
    const second = await newPerson(school.id, ["proprietor"])
    const racing = await as(proprietor, school)
    await ownerRun(sql`
      update platform.memberships set status = 'suspended' where id = ${proprietor.membershipId}`)
    expect(await change(racing, second, ["teacher"])).toMatch(
      /at least one active proprietor/
    )
    // Rule 6: a stale sign-in must confirm first.
    expect(
      await refusal(
        changeMemberRoles(
          await as(second, school, { signedInMinutesAgo: 30 }),
          {
            school: "x",
            membershipId: teacher.membershipId,
            roles: ["teacher", "bursar"],
            customRoleIds: [],
          }
        )
      )
    ).toBe(new ReauthRequiredError().name)
  })
})

describe("custom roles (criterion 3)", () => {
  it("grants exactly its permissions, and its second-step rule", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const teacher = await newPerson(school.id, ["teacher"])
    const ctx = await as(proprietor, school)
    const role = await saveCustomRole(ctx, {
      school: "x",
      name: "Exams officer",
      description: "Runs the exams",
      permissions: ["identity.member.read"],
      requiresMfa: true,
    })
    await changeMemberRoles(ctx, {
      school: "x",
      membershipId: teacher.membershipId,
      roles: ["teacher"],
      customRoleIds: [role.id],
    })
    const access = await accessFor(app.db, teacher.userId)
    const here = access.schools.find((s) => s.school.id === school.id)
    expect(here?.customPermissions).toEqual(["identity.member.read"])
    expect(here?.mfaRequired).toBe(true)
    expect(access.mfaRequired).toBe(true)
    // In another school the custom role counts for nothing.
    const other = await newSchool()
    await join(other.id, teacher.userId, ["teacher"])
    const elsewhere = (await accessFor(app.db, teacher.userId)).schools.find(
      (s) => s.school.id === other.id
    )
    expect(elsewhere?.customPermissions).toEqual([])
  })

  it("refuses names of built-in roles, duplicates and never-allowed permissions", async () => {
    const school = await newSchool()
    const ctx = await as(await newPerson(school.id, ["proprietor"]), school)
    const save = (name: string, permissions: string[]) =>
      refusal(
        saveCustomRole(ctx, {
          school: "x",
          name,
          description: "",
          permissions,
          requiresMfa: false,
        })
      )
    expect(await save("Teacher", [])).toMatch(/built-in role/)
    expect(await save("Clerk", [])).toBe("accepted")
    expect(await save("clerk", [])).toMatch(/already exists/)
    expect(
      await save("Approver", ["identity.role.approve_restricted"])
    ).toMatch(/from the list/)
  })

  it("lets only the proprietor add a restricted permission", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const admin = await newPerson(school.id, ["school_admin"], { mfa: true })
    // A test-only restricted action: the real ones arrive with their features.
    const restricted = RESTRICTED_ACTIONS as Set<string>
    restricted.add("audit.event.read")
    try {
      const input = {
        school: "x",
        name: "Auditor",
        description: "",
        permissions: ["audit.event.read"],
        requiresMfa: false,
      }
      expect(
        await refusal(saveCustomRole(await as(admin, school), input))
      ).toMatch(/Only the proprietor/)
      const saved = await saveCustomRole(await as(proprietor, school), input)
      expect(saved.restrictedApproved).toBe(true)
    } finally {
      restricted.delete("audit.event.read")
    }
  })
})

describe("the security log and access review (criterion 4)", () => {
  it("shows staff events and school-caused guardian events, nothing else", async () => {
    const school = await newSchool()
    const other = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const teacher = await newPerson(school.id, ["teacher"])
    const parent = await newPerson(school.id, ["guardian"])
    const otherTeacher = await newPerson(other.id, ["teacher"])
    for (const [userId, kind, caused] of [
      [teacher.userId, "sign_in", null],
      [parent.userId, "sign_in", null],
      [parent.userId, "phone_changed", school.id],
      [otherTeacher.userId, "sign_in", null],
      [teacher.userId, "roles_changed", other.id],
    ] as const) {
      await ownerRun(sql`
        insert into platform.security_events (user_id, kind, caused_by_school_id)
        values (${userId}, ${kind}, ${caused})`)
    }
    const log = await readSecurityLog(await as(proprietor, school), {
      school: "x",
      failuresOnly: false,
    })
    const seen = log.data.map((entry) => `${entry.userId ?? ""}:${entry.kind}`)
    expect(seen).toEqual(
      expect.arrayContaining([
        `${teacher.userId}:sign_in`,
        `${parent.userId}:phone_changed`,
      ])
    )
    expect(seen).not.toContain(`${parent.userId}:sign_in`)
    expect(seen).not.toContain(`${otherTeacher.userId}:sign_in`)
    expect(seen).not.toContain(`${teacher.userId}:roles_changed`)
  })

  it("is refused to anyone but the proprietor", async () => {
    const school = await newSchool()
    const admin = await newPerson(school.id, ["school_admin"], { mfa: true })
    expect(
      await refusal(
        readSecurityLog(await as(admin, school), {
          school: "x",
          failuresOnly: false,
        })
      )
    ).toBe("ForbiddenError")
  })

  it("lists elevated roles with second step and last sign-in, as safe CSV", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"], { mfa: true })
    await newPerson(school.id, ["teacher"])
    const bursar = await newPerson(school.id, ["bursar"])
    await ownerRun(
      sql`update platform.users set name = '=SUM(A1)' where id = ${bursar.userId}`
    )
    const rows = await accessReview(await as(proprietor, school))
    expect(rows.map((row) => row.userId).sort()).toEqual(
      [proprietor.userId, bursar.userId].sort()
    )
    const csv = accessReviewCsv(rows)
    expect(csv).toContain(`"'=SUM(A1)"`)
    expect(csv.split("\r\n")[0]).toContain("Second step")
  })
})

describe("the school changes a sign-in number (criterion 5)", () => {
  const check = {
    school: "x",
    checkMethod: "in_person",
    evidence: "parent_id",
    reason: "sim_lost",
    note: "",
  } as const

  it("changes it after a code to the new number, with notices and sign-out", async () => {
    const school = await newSchool()
    const admin = await newPerson(school.id, ["school_admin"], { mfa: true })
    const parent = await newPerson(school.id, ["guardian"])
    await addSession(parent.userId)
    const ctx = await as(admin, school)
    const phone = newPhone()
    const { changeId } = await startNumberChange(ctx, {
      ...check,
      membershipId: parent.membershipId,
      phone,
    })
    await confirmNumberChange(ctx, {
      school: "x",
      changeId,
      phone,
      code: codeIn(fakeSms.lastTo(phone)?.body),
    })
    const user = await ownerRun(
      sql`select phone_number from platform.users where id = ${parent.userId}`
    )
    expect(user.rows[0]?.phone_number).toBe(phone)
    expect(fakeSms.lastTo(parent.phone)?.body).toMatch(/was changed by/)
    expect(await sessionsOf(parent.userId)).toBe(0)
    const record = await ownerRun(sql`
      select status, new_number_ending from platform.contact_changes where id = ${changeId}`)
    expect(record.rows[0]).toEqual({
      status: "done",
      new_number_ending: phone.slice(-3),
    })
    // A second change within 30 days needs Akoso support.
    expect(
      await refusal(
        startNumberChange(ctx, {
          ...check,
          membershipId: parent.membershipId,
          phone: newPhone(),
        })
      )
    ).toMatch(/changed recently/)
  })

  it("refuses people with a second step, and people in another school", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"], { mfa: true })
    const bursar = await newPerson(school.id, ["bursar"], { mfa: true })
    const parent = await newPerson(school.id, ["guardian"])
    await join((await newSchool()).id, parent.userId, ["guardian"])
    const ctx = await as(proprietor, school)
    const start = (target: Person) =>
      refusal(
        startNumberChange(ctx, {
          ...check,
          membershipId: target.membershipId,
          phone: newPhone(),
        })
      )
    expect(await start(bursar)).toMatch(/second step/)
    expect(await start(parent)).toMatch(/another school/)
    expect(await start(proprietor)).toMatch(/your own account/)
  })
})

describe("backup numbers (criterion 6)", () => {
  it("adds one after a code; no number serves two accounts", async () => {
    const school = await newSchool()
    const parent = await newPerson(school.id, ["guardian"])
    const neighbour = await newPerson(school.id, ["guardian"])
    const ctx = await as(parent, null)
    const phone = newPhone()
    await requestBackupPhone(ctx, { phone })
    await confirmBackupPhone(ctx, {
      phone,
      code: codeIn(fakeSms.lastTo(phone)?.body),
    })
    const saved = await ownerRun(sql`
      select phone_number from platform.user_backup_phones where user_id = ${parent.userId}`)
    expect(saved.rows[0]?.phone_number).toBe(phone)
    // The database refuses another account's main number as a backup, either way round.
    await expect(
      ownerRun(sql`
        insert into platform.user_backup_phones (user_id, phone_number, verified_at)
        values (${neighbour.userId}, ${parent.phone}, now())`)
    ).rejects.toThrow()
    await expect(
      ownerRun(sql`
        update platform.users set phone_number = ${phone} where id = ${neighbour.userId}`)
    ).rejects.toThrow()
    expect(
      await refusal(requestBackupPhone(ctx, { phone: neighbour.phone }))
    ).toMatch(/can't be used/)
  })
})

describe("second-step reset by the school (criterion 7)", () => {
  const check = {
    school: "x",
    checkMethod: "in_person",
    evidence: "staff_id",
    reason: "authenticator_lost",
    note: "",
  } as const

  it("removes a bursar's second step, so they set it up again", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"], { mfa: true })
    const bursar = await newPerson(school.id, ["bursar"], { mfa: true })
    await resetMemberMfa(await as(proprietor, school), {
      ...check,
      membershipId: bursar.membershipId,
    })
    const user = await ownerRun(sql`
      select two_factor_enabled,
             (select count(*)::int from platform.two_factors where user_id = u.id) as factors
      from platform.users u where id = ${bursar.userId}`)
    expect(user.rows[0]).toEqual({ two_factor_enabled: false, factors: 0 })
    expect(
      await refusal(
        resetMemberMfa(await as(proprietor, school), {
          ...check,
          membershipId: proprietor.membershipId,
        })
      )
    ).toMatch(/your own account/)
  })
})

describe("account deletion (criterion 8)", () => {
  it("wipes the person and ends their memberships, keeping audit records", async () => {
    const school = await newSchool()
    const parent = await newPerson(school.id, ["guardian"])
    await addSession(parent.userId)
    await deleteMyAccount(await as(parent, null))
    const user = await ownerRun(sql`
      select name, phone_number, deleted_at is not null as deleted
      from platform.users where id = ${parent.userId}`)
    expect(user.rows[0]).toEqual({
      name: "Deleted account",
      phone_number: null,
      deleted: true,
    })
    const membership = await ownerRun(sql`
      select status from platform.memberships where id = ${parent.membershipId}`)
    expect(membership.rows[0]?.status).toBe("ended")
    expect(await sessionsOf(parent.userId)).toBe(0)
    const audit = await ownerRun(sql`
      select entity_id from platform.audit_events
      where tenant_id = ${school.id} and action = 'membership.ended'`)
    expect(audit.rows[0]?.entity_id).toBe(parent.membershipId)
  })

  it("refuses the last proprietor, and anyone whose sign-in is stale", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"], { mfa: true })
    expect(await refusal(deleteMyAccount(await as(proprietor, null)))).toMatch(
      /only proprietor/
    )
    const parent = await newPerson(school.id, ["guardian"])
    expect(
      await refusal(
        deleteMyAccount(await as(parent, null, { signedInMinutesAgo: 60 }))
      )
    ).toBe("ReauthRequiredError")
  })

  it("cannot end a living person's memberships through the database function", async () => {
    const school = await newSchool()
    const parent = await newPerson(school.id, ["guardian"])
    await expect(
      app.db.execute(
        sql`select * from platform.end_memberships_of_deleted_user(${parent.userId})`
      )
    ).rejects.toThrow()
  })
})

describe("email change (criterion 9)", () => {
  it("confirms a staff member's new email by link", async () => {
    const school = await newSchool()
    const teacher = await newPerson(school.id, ["teacher"], {
      email: `old-${randomUUID().slice(0, 8)}@school.test`,
    })
    const address = `new-${randomUUID().slice(0, 8)}@school.test`
    await requestEmailChange(await as(teacher, null), { email: address })
    const link = /token=([\w-]+)/.exec(fakeEmail.lastTo(address)?.text ?? "")
    const token = decodeURIComponent(link?.[1] ?? "")
    const ctx = await as(teacher, null)
    expect(
      await confirmEmailChange(ctx, { userId: teacher.userId, token })
    ).toBe(true)
    // The link works once.
    expect(
      await confirmEmailChange(ctx, { userId: teacher.userId, token })
    ).toBe(false)
    const user = await ownerRun(
      sql`select email from platform.users where id = ${teacher.userId}`
    )
    expect(user.rows[0]?.email).toBe(address)
  })

  it("is not offered to parents", async () => {
    const school = await newSchool()
    const parent = await newPerson(school.id, ["guardian"])
    expect(
      await refusal(
        requestEmailChange(await as(parent, null), { email: "p@example.com" })
      )
    ).toBe("ForbiddenError")
  })
})

describe("listing people", () => {
  it("lists staff and guardians apart", async () => {
    const school = await newSchool()
    const proprietor = await newPerson(school.id, ["proprietor"])
    const parent = await newPerson(school.id, ["guardian"])
    const ctx = await as(proprietor, school)
    const staff = await listMembers(ctx, {
      school: "x",
      filter: "staff",
      search: "",
    })
    const guardians = await listMembers(ctx, {
      school: "x",
      filter: "guardians",
      search: "",
    })
    expect(staff.data.map((m) => m.userId)).toEqual([proprietor.userId])
    expect(guardians.data.map((m) => m.userId)).toEqual([parent.userId])
  })
})
