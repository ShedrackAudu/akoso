// Short, single-use tickets that let someone register a passkey without a session
// (section 8): from an enrolment link, or after a recovery code. Valid for 10 minutes.
// Only a hash is stored; the ticket itself travels as the passkey plugin's `context`.
import { createHash, randomBytes, randomUUID } from "node:crypto"

import { sql, type Database } from "@akoso/db"

type Executor = Pick<Database, "execute">

export type TicketPurpose = "enrol" | "recovery"

export interface Ticket {
  userId: string
  email: string
  name: string
  purpose: TicketPurpose
}

const PREFIX = "ticket:"
const LIFETIME_SECONDS = 10 * 60

const identifierFor = (ticket: string): string =>
  `team-ticket:${createHash("sha256").update(ticket).digest("hex")}`

/** A new ticket for a team member; returns the `context` value the client sends. */
export async function issueTicket(
  db: Executor,
  userId: string,
  purpose: TicketPurpose,
  now: Date
): Promise<string> {
  const ticket = randomBytes(32).toString("base64url")
  await db.execute(sql`
    insert into platform.team_verifications (id, identifier, value, expires_at, created_at, updated_at)
    values (${randomUUID()}, ${identifierFor(ticket)},
            ${JSON.stringify({ userId, purpose })},
            ${new Date(now.getTime() + LIFETIME_SECONDS * 1000).toISOString()}, now(), now())`)
  return `${PREFIX}${ticket}`
}

function parse(context: string): string | null {
  if (!context.startsWith(PREFIX)) return null
  const ticket = context.slice(PREFIX.length)
  return /^[\w-]{40,50}$/.test(ticket) ? ticket : null
}

async function toTicket(db: Executor, value: unknown): Promise<Ticket | null> {
  let parsed: { userId?: unknown; purpose?: unknown }
  try {
    parsed = JSON.parse(String(value)) as typeof parsed
  } catch {
    return null
  }
  if (typeof parsed.userId !== "string") return null
  if (parsed.purpose !== "enrol" && parsed.purpose !== "recovery") return null
  const user = await db.execute(sql`
    select name, email from platform.team_users
    where id = ${parsed.userId} and removed_at is null`)
  const row = user.rows[0]
  if (row === undefined) return null
  return {
    userId: parsed.userId,
    email: String(row.email),
    name: String(row.name),
    purpose: parsed.purpose,
  }
}

/** The ticket's person, if it is still good. Does not use it up. */
export async function peekTicket(
  db: Executor,
  context: string,
  now: Date
): Promise<Ticket | null> {
  const ticket = parse(context)
  if (ticket === null) return null
  const result = await db.execute(sql`
    select value from platform.team_verifications
    where identifier = ${identifierFor(ticket)} and expires_at > ${now.toISOString()}`)
  const row = result.rows[0]
  return row === undefined ? null : toTicket(db, row.value)
}

/** Uses the ticket up: it works once. */
export async function useTicket(
  db: Executor,
  context: string,
  now: Date
): Promise<Ticket | null> {
  const ticket = parse(context)
  if (ticket === null) return null
  const result = await db.execute(sql`
    delete from platform.team_verifications
    where identifier = ${identifierFor(ticket)}
    returning value, expires_at`)
  const row = result.rows[0]
  if (row === undefined) return null
  if (new Date(String(row.expires_at)) <= now) return null
  return toTicket(db, row.value)
}
