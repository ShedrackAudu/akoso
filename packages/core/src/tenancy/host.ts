// Which kind of address a request came to (brief section 7). Pure: no database. The
// request proxy uses it before any lookup, so most bad hosts never reach Postgres.
import { RESERVED_SLUGS } from "@akoso/schemas/tenancy"

export type HostKind =
  /** app.{domain}: the signed-in app, server actions and /api/v1. */
  | { kind: "app" }
  /** {slug}.{domain}: a school's public pages. */
  | { kind: "school"; slug: string }
  /** Anything else that looks like a hostname: maybe a school's custom domain. */
  | { kind: "custom"; hostname: string }
  /** Not ours: an IP address, a malformed name, another base domain's subdomain. */
  | { kind: "unknown" }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HOSTNAME =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

/** Lower-cases a Host header and removes its port and any trailing dot. */
export function normaliseHost(host: string): string {
  let value = host.trim().toLowerCase()
  if (value.startsWith("[")) return value // IPv6 literal: never ours
  value = value.replace(/:\d+$/, "").replace(/\.$/, "")
  return value
}

/**
 * Classifies a request's Host header.
 *
 * @param baseDomain APP_BASE_DOMAIN, e.g. akoso.ng (akoso.localhost locally). When it is
 *   a local `.localhost` domain, plain `localhost` and `127.0.0.1` also count as the
 *   app, so local tools keep working; that never applies to a real domain.
 */
export function classifyHost(host: string, baseDomain: string): HostKind {
  const name = normaliseHost(host)
  const base = baseDomain.toLowerCase()
  if (name === `app.${base}`) return { kind: "app" }
  if (
    base.endsWith(".localhost") &&
    (name === "localhost" || name === "127.0.0.1")
  ) {
    return { kind: "app" }
  }
  if (name.endsWith(`.${base}`)) {
    const label = name.slice(0, -(base.length + 1))
    if (
      label.includes(".") ||
      !SLUG.test(label) ||
      label.length < 3 ||
      label.length > 40 ||
      RESERVED_SLUGS.has(label)
    ) {
      return { kind: "unknown" }
    }
    return { kind: "school", slug: label }
  }
  if (
    name === base ||
    name.length > 253 ||
    IPV4.test(name) ||
    !HOSTNAME.test(name) ||
    name.endsWith(".localhost")
  ) {
    return { kind: "unknown" }
  }
  return { kind: "custom", hostname: name }
}
