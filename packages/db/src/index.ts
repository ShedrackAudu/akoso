// Public interface of @akoso/db: the database client and withTenant().
// Tables are imported per module from "@akoso/db/schema/<module>", so the boundary check can see which module uses which tables.
export { createDatabase } from "./client"
export type { Database, DatabaseHandle, TenantTransaction } from "./client"
export { InvalidTenantIdError, withTenant } from "./with-tenant"
// Re-exported so every package builds parameterised SQL with the same Drizzle version.
export { sql } from "drizzle-orm"
