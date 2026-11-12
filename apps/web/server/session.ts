// Signed-in pages: who is here, in which school, or where to send them instead.
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { resolveSignedIn } from "@akoso/core/identity"
import {
  createLogger,
  getDatabase,
  MfaRequiredError,
  newRequestId,
  NotFoundError,
  type RequestContext,
} from "@akoso/core/kernel"

const log = createLogger()

/**
 * The signed-in context for a page, or a redirect: to sign-in when nobody is signed
 * in, to security settings when a required second step is missing, and 404 when the
 * school is not one of theirs.
 *
 * @param schoolSlug The school in the address, or null for pages that span schools.
 */
export async function requireSignedIn(
  schoolSlug: string | null,
  options: { allowWithoutMfa?: boolean } = {}
): Promise<RequestContext> {
  const incoming = new Headers(await headers())
  const requestId = newRequestId()
  try {
    const ctx = await resolveSignedIn(
      incoming,
      {
        requestId,
        db: getDatabase(),
        now: () => new Date(),
        log: log.child({ requestId }),
      },
      schoolSlug === null ? null : { slug: schoolSlug },
      options
    )
    if (ctx === null) {
      redirect(
        schoolSlug === null
          ? "/sign-in"
          : `/${encodeURIComponent(schoolSlug)}/sign-in`
      )
    }
    return ctx
  } catch (error) {
    if (error instanceof MfaRequiredError) redirect("/account/security")
    if (error instanceof NotFoundError) notFound()
    throw error
  }
}
