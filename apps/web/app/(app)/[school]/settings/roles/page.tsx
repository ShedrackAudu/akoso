import type { Metadata } from "next"
import type { JSX } from "react"

import { getSchoolMfaRoles, listCustomRoles } from "@akoso/core/identity"
import {
  CUSTOM_ROLE_ACTIONS,
  RESTRICTED_ACTIONS,
} from "@akoso/schemas/permissions"

import { RolesEditor } from "@/features/staff/settings/roles-editor"
import { SettingsShell } from "@/features/staff/settings/settings-shell"
import { can, identityFor, requirePermission } from "@/server/session"
import { settingsPagesFor } from "@/server/settings"

// The school's own roles, and which roles must use a second step (part B, section 2).
export const metadata: Metadata = { title: "Roles" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

export default async function RolesPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "identity.role.manage")
  const [roles, mfaRoles, identity] = await Promise.all([
    listCustomRoles(ctx),
    getSchoolMfaRoles(ctx),
    identityFor(ctx),
  ])
  return (
    <SettingsShell
      schoolName={ctx.school?.name ?? ""}
      title="Roles"
      nav={{ school, current: "roles", show: settingsPagesFor(ctx) }}
    >
      <RolesEditor
        school={school}
        roles={roles}
        mfaRoles={mfaRoles}
        offered={[...CUSTOM_ROLE_ACTIONS]}
        restricted={[...RESTRICTED_ACTIONS]}
        held={
          ctx.actor.kind === "user"
            ? [...ctx.actor.permissions].map(String)
            : []
        }
        isProprietor={can(ctx, "identity.role.approve_restricted")}
        identity={identity}
      />
    </SettingsShell>
  )
}
