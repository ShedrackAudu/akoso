// School lookups for the request proxy and the public school pages, cached per web
// instance (spec: docs/specs/stage-1-tenancy.md, section 4).
import { getDatabase } from "@akoso/core/kernel"
import {
  createSchoolCache,
  findSchoolByHost,
  findSchoolBySlug,
} from "@akoso/core/tenancy"
import type { SchoolSummary } from "@akoso/schemas/tenancy"

const cache = createSchoolCache()

export function schoolBySlug(slug: string): Promise<SchoolSummary | null> {
  return cache.get(`slug:${slug}`, () => findSchoolBySlug(getDatabase(), slug))
}

export function schoolByHost(hostname: string): Promise<SchoolSummary | null> {
  return cache.get(`host:${hostname}`, () =>
    findSchoolByHost(getDatabase(), hostname)
  )
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
