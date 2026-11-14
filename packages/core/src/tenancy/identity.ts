// The school's name and time zone, which stay on platform.tenants (school setup part A
// spec, section 2). The app role cannot write that table; the database function changes
// only these two fields, and only for the transaction's own school. The slug is never
// changed here: Akoso support changes it (open question 4).
import { sql, type TenantTransaction } from "@akoso/db"
import { time } from "@akoso/domain"

const text = (value: unknown): string =>
  typeof value === "string" ? value : ""

export interface SchoolIdentity {
  name: string
  timeZone: string
}

/** The school's current name and time zone, inside its own transaction. */
export async function readSchoolIdentity(
  tx: TenantTransaction,
  tenantId: string
): Promise<SchoolIdentity> {
  const result = await tx.execute(
    sql`select name, time_zone from platform.tenant_by_id(${tenantId})`
  )
  const row = result.rows[0]
  return { name: text(row?.name), timeZone: text(row?.time_zone) }
}

/**
 * Changes the transaction's own school's name and time zone. Call it inside the
 * withTenant() transaction of the use case that asked, so it commits with the audit
 * record. Callers check the permission and validate the input first.
 *
 * @throws Error when the time zone is unknown (the use case checks it first).
 */
export async function updateSchoolIdentity(
  tx: TenantTransaction,
  identity: SchoolIdentity
): Promise<SchoolIdentity> {
  if (!time.isValidTimeZone(identity.timeZone)) {
    throw new Error("updateSchoolIdentity() was given an unknown time zone")
  }
  const result = await tx.execute(
    sql`select name, time_zone from platform.update_school_identity(${identity.name}, ${identity.timeZone})`
  )
  const row = result.rows[0]
  return { name: text(row?.name), timeZone: text(row?.time_zone) }
}
