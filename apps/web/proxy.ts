// Runs before every page and route (Next.js proxy). Decides, from the Host header
// alone, whether a request is for the signed-in app or for a school's public pages,
// and refuses everything else (brief section 7; spec docs/specs/stage-1-tenancy.md,
// section 4).
import { NextResponse, type NextRequest } from "next/server"

import { loadEnv } from "@akoso/core/config"
import { classifyHost } from "@akoso/core/tenancy"

import { schoolByHost, schoolBySlug } from "@/server/schools"

/** The internal route that renders a school's public pages. */
const SCHOOL_SITE = "/school-site"

const notFound = () =>
  new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  })

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const baseDomain = loadEnv(process.env).APP_BASE_DOMAIN
  // Only Host counts. X-Forwarded-Host is never trusted.
  const host = classifyHost(request.headers.get("host") ?? "", baseDomain)
  const path = request.nextUrl.pathname

  if (host.kind === "app") {
    // School pages are reached only through a school's own address.
    if (path === SCHOOL_SITE || path.startsWith(`${SCHOOL_SITE}/`)) {
      return notFound()
    }
    return NextResponse.next()
  }
  if (host.kind === "unknown") return notFound()

  const school =
    host.kind === "school"
      ? await schoolBySlug(host.slug)
      : await schoolByHost(host.hostname)
  if (school === null || school.status === "closed") return notFound()

  // A school's address serves its public pages only: no app routes, no /api/v1.
  if (path !== "/") return notFound()

  const url = request.nextUrl.clone()
  url.pathname = `${SCHOOL_SITE}/${school.slug}`
  // Cookies never reach a school's address: sign-in lives on app.{domain} only.
  const forwarded = new Headers(request.headers)
  forwarded.delete("cookie")
  return NextResponse.rewrite(url, { request: { headers: forwarded } })
}

export const config = {
  // Everything except build assets and the public files every page may load.
  matcher: [
    "/((?!_next/static|_next/image|brand/|favicon\\.ico|favicon\\.svg|favicon-16\\.png|favicon-32\\.png|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png).*)",
  ],
}
