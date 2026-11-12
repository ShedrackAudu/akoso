// Clearly fake schools for local development and tests (spec: stage-1-tenancy.md,
// section 6). Re-runnable: rows are matched by fixed IDs and updated in place. Refuses
// to run in production. `pnpm db:seed`; the database tests run it before they start.
import { pathToFileURL } from "node:url"

import pg from "pg"

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

/**
 * @param {string} connectionString The migration role, which owns the tenancy tables.
 */
export async function seed(connectionString) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed script never runs in production")
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
    await client.query("commit")
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
  await seed(process.env.DATABASE_MIGRATOR_URL ?? LOCAL_MIGRATOR_URL)
  console.log(`Seeded ${String(SEED.schools.length)} schools`)
}
