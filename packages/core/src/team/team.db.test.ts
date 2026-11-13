// Akoso team sign-in against the local database (spec: docs/specs/stage-1-sign-in-part-b.md,
// section 8, acceptance criteria 10, 13 and 14 at the use-case level; the passkey
// ceremonies themselves are in the end-to-end tests). Run with `pnpm test:db`.
import { createHash, randomBytes, randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createDatabase, sql } from "@akoso/db"
import {
  teamPermissionsFor,
  type TeamRoleKey,
} from "@akoso/schemas/permissions"

import { createLogger, ValidationError } from "../kernel/index"
import { verifyTeamAuditChain } from "./audit"
import type { TeamBase, TeamContext } from "./context"
import {
  changeTeamRoles,
  createRecoveryCodes,
  deleteMyPasskey,
  inviteTeamMember,
  removeTeamMember,
  startEnrolment,
  startRecovery,
} from "./service"
import { peekTicket, useTicket } from "./tickets"

const APP_URL =
  process.env.TEST_APP_DATABASE_URL ??
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const OWNER_URL =
  process.env.TEST_OWNER_DATABASE_URL ??
  "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev"

const app = createDatabase(APP_URL, 4)
const owner = createDatabase(OWNER_URL, 1)

beforeAll(() => {
  // teamSettings() reads these: the key for recovery codes, the address for links.
  // A fresh random key per run, when none is set.
  process.env.BETTER_AUTH_SECRET ??= randomBytes(32).toString("hex")
  process.env.APP_BASE_DOMAIN ??= "akoso.localhost"
  process.env.DATABASE_URL ??= APP_URL
})
afterAll(async () => {
  await app.close()
  await owner.close()
})

const base = (): TeamBase => {
  const now = new Date()
  return {
    requestId: `req_test_${randomUUID().slice(0, 8)}`,
    db: app.db,
    now: () => now,
    log: createLogger({}, () => undefined),
  }
}

interface Person {
  userId: string
  email: string
}

async function newMember(roles: TeamRoleKey[]): Promise<Person> {
  const userId = randomUUID()
  const email = `team-${userId.slice(0, 8)}@akoso.test`
  await owner.db.execute(sql`
    insert into platform.team_users (id, name, email)
    values (${userId}, ${`Member ${userId.slice(0, 6)}`}, ${email})`)
  for (const role of roles) {
    await owner.db.execute(sql`
      insert into platform.team_role_grants (user_id, role) values (${userId}, ${role})`)
  }
  return { userId, email }
}

function as(
  person: Person,
  roles: TeamRoleKey[],
  options: { signedInMinutesAgo?: number } = {}
): TeamContext {
  const ctx = base()
  return {
    ...ctx,
    member: {
      userId: person.userId,
      name: "Test",
      email: person.email,
      roles,
      permissions: teamPermissionsFor(roles),
      signedInAt: new Date(
        ctx.now().getTime() - (options.signedInMinutesAgo ?? 1) * 60 * 1000
      ),
    },
  }
}

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

const tokenOf = (link: string): string =>
  decodeURIComponent(new URL(link).searchParams.get("token") ?? "")

async function addPasskey(userId: string): Promise<void> {
  await owner.db.execute(sql`
    insert into platform.team_passkeys
      (id, name, public_key, user_id, credential_id, counter, device_type, backed_up)
    values (${randomUUID()}, 'Test', 'public-key', ${userId},
            ${randomBytes(16).toString("hex")}, 0, 'singleDevice', false)`)
}

async function countFor(table: string, userId: string): Promise<number> {
  const result = await owner.db.execute(
    sql`select count(*)::int as n from ${sql.raw(`platform.${table}`)} where user_id = ${userId}`
  )
  return Number(result.rows[0]?.n)
}

describe("enrolment links", () => {
  it("work once, give a ticket that works once, and never store the token", async () => {
    const theOwner = await newMember(["owner"])
    const { link } = await inviteTeamMember(as(theOwner, ["owner"]), {
      name: "New Support",
      email: `support-${randomUUID().slice(0, 8)}@akoso.test`,
      roles: ["support"],
      confirmEmail: "",
    })
    const token = tokenOf(link)
    const stored = await owner.db.execute(sql`
      select token_hash from platform.team_invitations
      where token_hash = ${createHash("sha256").update(token).digest("hex")}`)
    expect(stored.rows).toHaveLength(1)

    const { ticket } = await startEnrolment(base(), { token })
    expect(await refusal(startEnrolment(base(), { token }))).toMatch(
      /doesn't work/
    )
    expect(await peekTicket(app.db, ticket, new Date())).not.toBeNull()
    expect(await useTicket(app.db, ticket, new Date())).not.toBeNull()
    expect(await useTicket(app.db, ticket, new Date())).toBeNull()
  })

  it("refuse an expired link", async () => {
    const person = await newMember(["support"])
    const token = randomBytes(32).toString("base64url")
    await owner.db.execute(sql`
      insert into platform.team_invitations (user_id, token_hash, expires_at)
      values (${person.userId}, ${createHash("sha256").update(token).digest("hex")},
              now() - interval '1 minute')`)
    expect(await refusal(startEnrolment(base(), { token }))).toMatch(
      /doesn't work/
    )
  })
})

describe("recovery codes", () => {
  it("each works once and is recorded; a wrong code gets the same answer", async () => {
    const person = await newMember(["support"])
    const { codes } = await createRecoveryCodes(as(person, ["support"]))
    expect(codes).toHaveLength(10)
    const stored = await owner.db.execute(sql`
      select code_hash from platform.team_recovery_codes where user_id = ${person.userId}`)
    expect(JSON.stringify(stored.rows)).not.toContain(
      codes[0]?.replace("-", "")
    )

    const code = codes[0] ?? ""
    const { ticket } = await startRecovery(
      base(),
      { email: person.email, code: code.toLowerCase() },
      null
    )
    expect(ticket).toMatch(/^ticket:/)
    const again = await refusal(
      startRecovery(base(), { email: person.email, code }, null)
    )
    const wrong = await refusal(
      startRecovery(base(), { email: person.email, code: "AAAAA-BBBBB" }, null)
    )
    expect(again).toBe(wrong)
    const events = await owner.db.execute(sql`
      select kind from platform.team_security_events
      where user_id = ${person.userId} and kind = 'recovery_code_used'`)
    expect(events.rows).toHaveLength(1)
  })

  it("can be remade only with a recent sign-in, once some exist", async () => {
    const person = await newMember(["support"])
    await createRecoveryCodes(as(person, ["support"]))
    expect(
      await refusal(
        createRecoveryCodes(as(person, ["support"], { signedInMinutesAgo: 20 }))
      )
    ).toBe("ReauthRequiredError")
  })
})

describe("the Owner manages the team (criterion 13)", () => {
  it("needs the email typed to grant the Owner role", async () => {
    const theOwner = await newMember(["owner"])
    const input = {
      name: "Second Owner",
      email: `owner-${randomUUID().slice(0, 8)}@akoso.test`,
      roles: ["owner"] as TeamRoleKey[],
    }
    expect(
      await refusal(
        inviteTeamMember(as(theOwner, ["owner"]), {
          ...input,
          confirmEmail: "",
        })
      )
    ).toMatch(/Type the person's email/)
    expect(
      await refusal(
        inviteTeamMember(as(theOwner, ["owner"]), {
          ...input,
          confirmEmail: input.email,
        })
      )
    ).toBe("accepted")
  })

  it("removes access at once: sessions, passkeys and codes go, and it is audited", async () => {
    const theOwner = await newMember(["owner"])
    const leaver = await newMember(["support"])
    await addPasskey(leaver.userId)
    await createRecoveryCodes(as(leaver, ["support"]))
    await owner.db.execute(sql`
      insert into platform.team_sessions (id, expires_at, token, user_id)
      values (${randomUUID()}, now() + interval '1 hour', ${randomUUID()}, ${leaver.userId})`)
    await removeTeamMember(as(theOwner, ["owner"]), {
      userId: leaver.userId,
      confirmEmail: "",
    })
    for (const table of [
      "team_sessions",
      "team_passkeys",
      "team_recovery_codes",
      "team_role_grants",
    ]) {
      expect(await countFor(table, leaver.userId)).toBe(0)
    }
    const audit = await owner.db.execute(sql`
      select action from platform.team_audit_events
      where entity_id = ${leaver.userId} and action = 'team.member.removed'`)
    expect(audit.rows).toHaveLength(1)
    expect(await verifyTeamAuditChain(app.db)).toEqual({ ok: true })
  })

  it("keeps the last Owner, refuses changing yourself, and needs a recent sign-in", async () => {
    const onlyOwner = await newMember(["owner"])
    const other = await newMember(["support"])
    // Remove every other Owner the earlier tests made, as far as this check goes.
    await owner.db.execute(sql`
      delete from platform.team_role_grants
      where role = 'owner' and user_id <> ${onlyOwner.userId}`)
    const ctx = as(onlyOwner, ["owner"])
    expect(
      await refusal(
        removeTeamMember(ctx, { userId: onlyOwner.userId, confirmEmail: "" })
      )
    ).toMatch(/your own access/)
    expect(
      await refusal(
        changeTeamRoles(ctx, {
          userId: onlyOwner.userId,
          roles: ["support"],
          confirmEmail: "",
        })
      )
    ).toMatch(/your own roles/)
    expect(
      await refusal(
        changeTeamRoles(as(onlyOwner, ["owner"], { signedInMinutesAgo: 10 }), {
          userId: other.userId,
          roles: ["ops"],
          confirmEmail: "",
        })
      )
    ).toBe("ReauthRequiredError")
    // A second Owner may not demote the last other Owner below one.
    const second = await newMember(["owner"])
    await changeTeamRoles(as(second, ["owner"]), {
      userId: onlyOwner.userId,
      roles: ["support"],
      confirmEmail: onlyOwner.email,
    })
    await owner.db.execute(sql`
      insert into platform.team_role_grants (user_id, role) values (${onlyOwner.userId}, 'owner')
      on conflict do nothing`)
    await owner.db.execute(sql`
      delete from platform.team_role_grants where user_id = ${second.userId}`)
    expect(
      await refusal(
        removeTeamMember(as(second, ["owner"]), {
          userId: onlyOwner.userId,
          confirmEmail: onlyOwner.email,
        })
      )
    ).toMatch(/last Owner/)
  })

  it("is refused to members without the permission", async () => {
    const support = await newMember(["support"])
    expect(
      await refusal(
        inviteTeamMember(as(support, ["support"]), {
          name: "X",
          email: "x@akoso.test",
          roles: ["sales"],
          confirmEmail: "",
        })
      )
    ).toBe("ForbiddenError")
  })
})

describe("passkeys", () => {
  it("keep at least one", async () => {
    const person = await newMember(["support"])
    await addPasskey(person.userId)
    const passkey = await owner.db.execute(sql`
      select id from platform.team_passkeys where user_id = ${person.userId}`)
    expect(
      await refusal(
        deleteMyPasskey(as(person, ["support"]), {
          id: String(passkey.rows[0]?.id),
        })
      )
    ).toMatch(/last one/)
  })
})

describe("the team audit chain", () => {
  it("is append-only for the app role, and catches an edited record", async () => {
    await expect(
      app.db.execute(
        sql`update platform.team_audit_events set action = 'team.x'`
      )
    ).rejects.toThrow()
    await expect(
      app.db.execute(sql`select * from platform.team_audit_chain_head`)
    ).rejects.toThrow()
    const person = await newMember(["support"])
    await createRecoveryCodes(as(person, ["support"]))
    const last = await owner.db.execute(
      sql`select seq from platform.team_audit_events order by seq desc limit 1`
    )
    const seq = Number(last.rows[0]?.seq)
    await owner.db.execute(sql`
      update platform.team_audit_events set action = 'team.tampered' where seq = ${seq}`)
    try {
      expect(await verifyTeamAuditChain(app.db)).toEqual({
        ok: false,
        brokenSeq: seq,
        reason: "content changed",
      })
    } finally {
      await owner.db.execute(sql`
        update platform.team_audit_events set action = 'team.recovery_codes.created'
        where seq = ${seq}`)
    }
    expect(await verifyTeamAuditChain(app.db)).toEqual({ ok: true })
  })
})
