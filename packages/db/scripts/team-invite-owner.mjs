// Creates the first Akoso team Owner and prints a single-use enrolment link, valid for
// 30 minutes (spec: docs/specs/stage-1-sign-in-part-b.md, section 8). Runs as the
// migration role, so only someone with database access can run it:
//
//   pnpm team:invite-owner owner@example.com "Their Name"
//
// It refuses when an active Owner already exists: Owners invite everyone else from the
// admin app. A lone Owner who has lost every passkey and recovery code follows the
// break-glass steps in docs/runbooks/account-recovery.md.
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"

import pg from "pg"

const LOCAL_MIGRATOR_URL =
  "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev"

/** The admin address's enrolment link (matches adminOrigins() in packages/core/src/team). */
function enrolmentLink(token) {
  const domain = process.env.APP_BASE_DOMAIN ?? "akoso.localhost"
  const origin = domain.endsWith(".localhost")
    ? `http://localhost:${process.env.ADMIN_PORT ?? "3001"}`
    : `https://admin.${domain}`
  return `${origin}/enrol?token=${encodeURIComponent(token)}`
}

/**
 * @param {string} connectionString The migration role's connection.
 * @param {string} email
 * @param {string} name
 * @returns {Promise<string>} The enrolment link.
 */
export async function inviteOwner(connectionString, email, name) {
  const address = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+$/.test(address)) throw new Error("Give a valid email")
  const displayName = name.trim() === "" ? address : name.trim()
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    await client.query("begin")
    const owners = await client.query(
      `select 1 from platform.team_role_grants g
       join platform.team_users u on u.id = g.user_id
       where g.role = 'owner' and u.removed_at is null limit 1`
    )
    if (owners.rows.length > 0) {
      throw new Error(
        "An active Owner already exists. Owners invite others from the admin app."
      )
    }
    const existing = await client.query(
      "select id from platform.team_users where email = $1",
      [address]
    )
    const id = existing.rows[0]?.id ?? randomUUID()
    if (existing.rows.length === 0) {
      await client.query(
        "insert into platform.team_users (id, name, email) values ($1, $2, $3)",
        [id, displayName, address]
      )
    } else {
      await client.query(
        "update platform.team_users set name = $2, removed_at = null, updated_at = now() where id = $1",
        [id, displayName]
      )
    }
    await client.query(
      `insert into platform.team_role_grants (user_id, role) values ($1, 'owner')
       on conflict do nothing`,
      [id]
    )
    const token = randomBytes(32).toString("base64url")
    await client.query(
      `insert into platform.team_invitations (user_id, token_hash, expires_at)
       values ($1, $2, now() + interval '30 minutes')`,
      [id, createHash("sha256").update(token).digest("hex")]
    )
    await client.query(
      `insert into platform.team_audit_events (actor, action, entity_type, entity_id, changes)
       values ('system:cli', 'team.owner.invited', 'team_user', $1, '{}'::jsonb)`,
      [id]
    )
    await client.query("commit")
    return enrolmentLink(token)
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.end()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [email, ...nameParts] = process.argv.slice(2)
  if (email === undefined) {
    console.error('Usage: pnpm team:invite-owner <email> ["Full Name"]')
    process.exit(1)
  }
  try {
    const link = await inviteOwner(
      process.env.DATABASE_MIGRATOR_URL ?? LOCAL_MIGRATOR_URL,
      email,
      nameParts.join(" ")
    )
    console.log(
      `Open this link within 30 minutes to create your passkey:\n${link}`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
