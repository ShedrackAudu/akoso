// Which school settings pages a person may see (sign-in part B, sections 1 to 3).
import type { RequestContext } from "@akoso/core/kernel"

import { can } from "./session"

export function settingsPagesFor(ctx: RequestContext): {
  team: boolean
  roles: boolean
  security: boolean
} {
  return {
    team: can(ctx, "identity.member.read"),
    roles: can(ctx, "identity.role.manage"),
    security:
      can(ctx, "identity.security_log.read") ||
      can(ctx, "identity.access_review.read"),
  }
}
