// School lookups for the request proxy and the public school pages, cached per web
// instance (spec: docs/specs/stage-1-tenancy.md, section 4).
import { getDatabase } from "@akoso/core/kernel"
import {
  createSchoolCache,
  findSchoolByHost,
  findSchoolBySlug,
} from "@akoso/core/tenancy"
import type { SchoolSummary } from "@akoso/schemas/tenancy"

// Two caches, each with its own lookup budget, so a flood of outside domains can never
// use up the budget for Akoso's own school addresses (PR #17 review, finding 1).
const bySlug = createSchoolCache()
const byHost = createSchoolCache()

/** @throws SchoolLookupBusyError when lookups are over budget and the school is unknown. */
export function schoolBySlug(slug: string): Promise<SchoolSummary | null> {
  return bySlug.get(slug, () => findSchoolBySlug(getDatabase(), slug))
}

/** @throws SchoolLookupBusyError when lookups are over budget and the host is unknown. */
export function schoolByHost(hostname: string): Promise<SchoolSummary | null> {
  return byHost.get(hostname, () => findSchoolByHost(getDatabase(), hostname))
}

/**
 * An address on the signed-in app, app.{domain}. Locally it keeps the port and plain
 * http that the current request used.
 */
export function appUrl(
  path: string,
  requestHost: string,
  baseDomain: string
): string {
  const local = baseDomain.endsWith(".localhost")
  const port = local ? (/:(\d+)$/.exec(requestHost)?.[0] ?? "") : ""
  return `${local ? "http" : "https"}://app.${baseDomain}${port}${path}`
}
