// School lookups, through the database's SECURITY DEFINER functions: the app role can
// call them but cannot read the tenancy tables (spec section 4).
import { sql, type Database } from "@akoso/db"
import { schoolSummarySchema, type SchoolSummary } from "@akoso/schemas/tenancy"

// The slug format, as the database checks it. Anything else cannot be a school, so it
// is answered without a query (review of PR #16, finding 8).
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function first(rows: Record<string, unknown>[]): SchoolSummary | null {
  const row = rows[0]
  if (row === undefined) return null
  return schoolSummarySchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    timeZone: row.time_zone,
  })
}

export async function findSchoolBySlug(
  db: Database,
  slug: string
): Promise<SchoolSummary | null> {
  const normalised = slug.toLowerCase()
  if (
    normalised.length < 3 ||
    normalised.length > 40 ||
    !SLUG.test(normalised)
  ) {
    return null
  }
  const result = await db.execute(
    sql`select * from platform.tenant_by_slug(${normalised})`
  )
  return first(result.rows)
}

export async function findSchoolById(
  db: Database,
  id: string
): Promise<SchoolSummary | null> {
  if (!UUID.test(id)) return null
  const result = await db.execute(
    sql`select * from platform.tenant_by_id(${id})`
  )
  return first(result.rows)
}

/** A school by its active custom domain. */
export async function findSchoolByHost(
  db: Database,
  hostname: string
): Promise<SchoolSummary | null> {
  const result = await db.execute(
    sql`select * from platform.tenant_by_host(${hostname.toLowerCase()})`
  )
  return first(result.rows)
}
