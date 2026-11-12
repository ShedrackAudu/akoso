// The one central permission check (brief section 6; docs/permissions.md). Every use
// case calls it before doing anything. Hiding a button is not access control.
import type { ActionKey } from "@akoso/schemas/api"

import type { RequestContext } from "./context"
import { ForbiddenError } from "./errors"

/**
 * Throws `ForbiddenError` unless the context's actor holds `action`.
 *
 * Signed-in users hold only the permissions their roles grant, which sign-in (Stage 1,
 * item 5) works out. Until then nobody holds any, so every check denies. The worker
 * (`system`) is trusted: it only runs jobs the code itself queued, and each job's use
 * case still works inside `withTenant()`.
 */
export function authorize(ctx: RequestContext, action: ActionKey): void {
  if (ctx.actor.kind === "system") return
  if (!ctx.actor.permissions.has(action)) {
    throw new ForbiddenError()
  }
}
