// Clearly fake schools for local development and tests (spec: stage-1-tenancy.md,
// section 6). Re-runnable: rows are matched by fixed IDs and updated in place. Refuses
// to run in production. `pnpm db:seed`; the database tests run it before they start.
import { randomBytes, scryptSync } from "node:crypto"
import { pathToFileURL } from "node:url"

import pg from "pg"

const LOCAL_APP_URL =
  "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev"
const LOCAL_MIGRATOR_URL =
  "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev"

export const SEED = {
  group: {
    id: "9f000000-0000-4000-8000-000000000001",
    name: "Bright Futures Schools",
  },
  schools: [
    // A group of two branches.
    {
      id: "9a000000-0000-4000-8000-000000000001",
      slug: "greenfield",
      name: "Greenfield Academy",
      status: "active",
      grouped: true,
    },
    {
      id: "9a000000-0000-4000-8000-000000000002",
      slug: "st-annes",
      name: "St Anne's College",
      status: "active",
      grouped: true,
    },
    // Standalone schools in the states the tests need.
    {
      id: "9a000000-0000-4000-8000-000000000003",
      slug: "harmony-paused",
      name: "Harmony Model School",
      status: "suspended",
      grouped: false,
    },
    {
      id: "9a000000-0000-4000-8000-000000000004",
      slug: "unity-leaving",
      name: "Unity Comprehensive",
      status: "read_only",
      grouped: false,
    },
    {
      id: "9a000000-0000-4000-8000-000000000005",
      slug: "pioneer-closed",
      name: "Pioneer Day School",
      status: "closed",
      grouped: false,
    },
    // The two schools the tenant-isolation suite uses.
    {
      id: "0a000000-0000-4000-8000-00000000000a",
      slug: "isolation-a",
      name: "Isolation Test School A",
      status: "active",
      grouped: false,
    },
    {
      id: "0b000000-0000-4000-8000-00000000000b",
      slug: "isolation-b",
      name: "Isolation Test School B",
      status: "active",
      grouped: false,
    },
  ],
}

const GREENFIELD = "9a000000-0000-4000-8000-000000000001"
const ST_ANNES = "9a000000-0000-4000-8000-000000000002"

/**
 * Clearly fake people (spec: stage-1-sign-in.md, Data changes). The passwords are for
 * local development and tests only; this script refuses to run anywhere real. Phone
 * numbers only ever reach the fake SMS provider, which exists only on .localhost.
 */
export const PEOPLE = [
  {
    id: "7a000000-0000-4000-8000-000000000001",
    name: "Adaeze Okafor (test proprietor)",
    email: "proprietor@greenfield.test",
    phone: "+2348031000001",
    password: "Greenfield-proprietor-local",
    memberships: [{ school: GREENFIELD, roles: ["proprietor"] }],
  },
  {
    id: "7a000000-0000-4000-8000-000000000002",
    name: "Bola Adeyemi (test bursar)",
    email: "bursar@greenfield.test",
    phone: "+2348031000002",
    password: "Greenfield-bursar-local",
    memberships: [{ school: GREENFIELD, roles: ["bursar"] }],
  },
  {
    id: "7a000000-0000-4000-8000-000000000003",
    name: "Chinedu Eze (test teacher)",
    email: "teacher@greenfield.test",
    phone: "+2348031000003",
    password: "Greenfield-teacher-local",
    memberships: [{ school: GREENFIELD, roles: ["teacher"] }],
  },
  {
    id: "7a000000-0000-4000-8000-000000000011",
    name: "Ngozi Bello (test parent)",
    email: null,
    phone: "+2348031000011",
    password: null,
    memberships: [{ school: GREENFIELD, roles: ["guardian"] }],
  },
  {
    // In two schools: the school picker shows both.
    id: "7a000000-0000-4000-8000-000000000012",
    name: "Tunde Ade (test parent, two schools)",
    email: null,
    phone: "+2348031000012",
    password: null,
    memberships: [
      { school: GREENFIELD, roles: ["guardian"] },
      { school: ST_ANNES, roles: ["guardian"] },
    ],
  },
]

/** Better Auth's scrypt format: "<salt hex>:<key hex>" (N 16384, r 16, p 1, 64 bytes). */
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${key.toString("hex")}`
}

/** People and their passwords: platform rows, written by the migration role. */
async function seedPeople(migrator) {
  for (const person of PEOPLE) {
    const email = person.email ?? `${person.id}@phone-only.akoso.invalid`
    await migrator.query(
      `insert into platform.users (id, name, email, email_verified, phone_number,
         phone_number_verified, two_factor_enabled)
       values ($1, $2, $3, $4, $5, true, false)
       on conflict (id) do update set name = excluded.name, email = excluded.email,
         phone_number = excluded.phone_number, two_factor_enabled = false,
         updated_at = now()`,
      [person.id, person.name, email, person.email !== null, person.phone]
    )
    // Every run starts from a known state: no second step, no sessions.
    await migrator.query(
      `delete from platform.two_factors where user_id = $1`,
      [person.id]
    )
    await migrator.query(`delete from platform.sessions where user_id = $1`, [
      person.id,
    ])
    await migrator.query(
      `delete from platform.user_credentials where user_id = $1`,
      [person.id]
    )
    if (person.password !== null) {
      await migrator.query(
        `insert into platform.user_credentials (id, account_id, provider_id, user_id, password)
         values (gen_random_uuid(), $1::text, 'credential', $1::uuid, $2)`,
        [person.id, hashPassword(person.password)]
      )
    }
  }
}

/**
 * Memberships, through the app role under RLS. Runs after the people are committed:
 * each membership's foreign key would otherwise wait on the open transaction.
 */
async function seedMemberships(appConnectionString) {
  const app = new pg.Client({ connectionString: appConnectionString })
  await app.connect()
  try {
    for (const person of PEOPLE) {
      for (const membership of person.memberships) {
        await app.query("begin")
        await app.query(`select set_config('app.tenant_id', $1, true)`, [
          membership.school,
        ])
        await app.query(
          `insert into platform.memberships (tenant_id, user_id, roles)
           values ($1, $2, $3)
           on conflict (tenant_id, user_id) do update
             set roles = excluded.roles, status = 'active', updated_at = now()`,
          [membership.school, person.id, membership.roles]
        )
        await app.query("commit")
      }
    }
  } finally {
    await app.end()
  }
}

/**
 * @param {string} connectionString The migration role, which owns the tenancy tables.
 * @param {string} [appConnectionString] The app role, for school rows under RLS.
 */
export async function seed(
  connectionString,
  appConnectionString = process.env.DATABASE_URL ?? LOCAL_APP_URL
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed script never runs in production")
  }
  const domain = process.env.APP_BASE_DOMAIN
  if (domain !== undefined && !domain.endsWith(".localhost")) {
    throw new Error(
      "The seed script runs only against a local .localhost setup"
    )
  }
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    await client.query("begin")
    await client.query(
      `insert into platform.groups (id, name) values ($1, $2)
       on conflict (id) do update set name = excluded.name, updated_at = now()`,
      [SEED.group.id, SEED.group.name]
    )
    for (const school of SEED.schools) {
      await client.query(
        `insert into platform.tenants (id, group_id, slug, name, status)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set group_id = excluded.group_id, slug = excluded.slug,
           name = excluded.name, status = excluded.status, updated_at = now()`,
        [
          school.id,
          school.grouped ? SEED.group.id : null,
          school.slug,
          school.name,
          school.status,
        ]
      )
    }
    await seedPeople(client)
    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.end()
  }
  await seedMemberships(appConnectionString)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await seed(process.env.DATABASE_MIGRATOR_URL ?? LOCAL_MIGRATOR_URL)
  console.log(
    `Seeded ${String(SEED.schools.length)} schools and ${String(PEOPLE.length)} people`
  )
}
