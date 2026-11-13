// The signed-in request (spec section 5): session → person → second step → school →
// roles → permissions. Called for every page, server action and /api/v1 request that
// needs someone signed in.
import { permissionsFor } from "@akoso/schemas/permissions"

import {
  MfaRequiredError,
  NotFoundError,
  type PublicContext,
  type RequestContext,
} from "../kernel/index"
import { accessFor } from "./access"
import { getAuth } from "./instance"

/** Which school the request is for: by address (slug) or by header (ID), or none. */
export type SchoolRef = { slug: string } | { id: string } | null

export interface ResolveOptions {
  /** Let a person whose role needs a second step in without one: only to set it up. */
  allowWithoutMfa?: boolean
}

/**
 * The signed-in context, or null when nobody is signed in (or their session has run
 * past their role's limits, in which case it is ended).
 *
 * @throws MfaRequiredError when the person's roles require a second step they lack.
 * @throws NotFoundError when the school is not one of the person's active memberships.
 */
export async function resolveSignedIn(
  headers: Headers,
  base: PublicContext,
  school: SchoolRef,
  options: ResolveOptions = {}
): Promise<RequestContext | null> {
  const auth = getAuth()
  const found = await auth.api.getSession({ headers })
  if (found === null) return null

  const access = await accessFor(base.db, found.user.id)

  // Staff session limits (D-25): at most this long since sign-in, and this long idle.
  const at = base.now().getTime()
  const startedAt = new Date(found.session.createdAt).getTime()
  const lastUsedAt = new Date(found.session.updatedAt).getTime()
  const tooOld =
    access.maxSessionSeconds !== null &&
    at - startedAt > access.maxSessionSeconds * 1000
  // Better Auth refreshes the session every 15 minutes of use, so allow for that.
  const idle =
    access.idleSeconds !== null &&
    at - lastUsedAt > (access.idleSeconds + 15 * 60) * 1000
  if (tooOld || idle) {
    await auth.api.revokeSession({
      headers,
      body: { token: found.session.token },
    })
    return null
  }

  const mfaEnabled =
    (found.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled ===
    true
  if (access.mfaRequired && !mfaEnabled && options.allowWithoutMfa !== true) {
    throw new MfaRequiredError()
  }

  let membership = null
  if (school !== null) {
    membership =
      access.schools.find((candidate) =>
        "slug" in school
          ? candidate.school.slug === school.slug.toLowerCase()
          : candidate.school.id === school.id
      ) ?? null
    // Not a member, or not active: the same answer as a school that does not exist.
    if (membership === null) throw new NotFoundError()
  }

  const roles = membership?.roles ?? [...access.roles]
  // Custom roles count only inside their own school.
  const customPermissions = membership?.customPermissions ?? []
  return {
    requestId: base.requestId,
    tenantId: membership?.school.id ?? null,
    school: membership?.school ?? null,
    db: base.db,
    now: base.now,
    log: base.log,
    actor: {
      kind: "user",
      userId: found.user.id,
      roles,
      permissions: permissionsFor(roles, customPermissions),
      signedInAt: new Date(found.session.createdAt),
    },
  }
}
