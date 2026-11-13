"use client"

// One team member's roles and access (sign-in part B, section 8). Owner changes need
// the person's email typed in; removing access ends it at once.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import type { TeamMemberSummary } from "@akoso/core/team"
import { TEAM_ROLE_KEYS, TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"
import { Button } from "@akoso/ui/components/button"

import { changeTeamRolesAction, removeTeamMemberAction } from "@/server/actions"

import { Field } from "./field"
import { ErrorText, useTeamAction } from "./use-team-action"

const BUTTON = "h-11 text-base"
const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"

const text = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

export function TeamMemberPanel({
  member,
  isSelf,
  canManage,
}: {
  member: TeamMemberSummary
  isSelf: boolean
  canManage: boolean
}): JSX.Element {
  const router = useRouter()
  const action = useTeamAction()
  const [notice, setNotice] = useState<string | null>(null)
  const [ownerTicked, setOwnerTicked] = useState(member.roles.includes("owner"))
  const editable = canManage && !isSelf && !member.removed
  const isOwner = member.roles.includes("owner")

  const saveRoles = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await action.run(changeTeamRolesAction, {
      userId: member.userId,
      roles: form.getAll("roles").map(String),
      confirmEmail: text(form, "confirmEmail"),
    })
    if (result === null) return
    setNotice("Roles saved. They've been signed out.")
    router.refresh()
  }

  const remove = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await action.run(removeTeamMemberAction, {
      userId: member.userId,
      confirmEmail: text(form, "confirmEmail"),
    })
    if (result === null) return
    setNotice("Access removed. Their sessions and passkeys are gone.")
    router.refresh()
  }

  if (member.removed) {
    return (
      <p className="text-base" data-testid="member-removed">
        This person&apos;s access has been removed. Invite them again to restore
        it.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {notice !== null && (
        <p role="status" className="text-base" data-testid="team-notice">
          {notice}
        </p>
      )}
      <ErrorText error={action.error} />
      {isSelf && (
        <p className="text-base text-muted-foreground">
          This is you. Another Owner can change your roles.
        </p>
      )}

      <form onSubmit={(event) => void saveRoles(event)} className={SECTION}>
        <h2 className="text-lg font-semibold">Roles</h2>
        <fieldset className="flex flex-col" disabled={!editable}>
          <legend className="sr-only">Roles</legend>
          {TEAM_ROLE_KEYS.map((role) => (
            <label
              key={role}
              className="flex min-h-11 items-center gap-3 text-base"
            >
              <input
                type="checkbox"
                name="roles"
                value={role}
                className="size-5"
                defaultChecked={member.roles.includes(role)}
                onChange={
                  role === "owner"
                    ? (event) => {
                        setOwnerTicked(event.target.checked)
                      }
                    : undefined
                }
              />
              {TEAM_ROLE_LABELS[role]}
            </label>
          ))}
        </fieldset>
        {editable && ownerTicked !== isOwner && (
          <Field
            id="roles-confirm"
            name="confirmEmail"
            label="Type their email to confirm the Owner change"
            type="email"
            required
          />
        )}
        {editable && (
          <Button type="submit" className={BUTTON} disabled={action.busy}>
            Save roles
          </Button>
        )}
      </form>

      {editable && (
        <form onSubmit={(event) => void remove(event)} className={SECTION}>
          <h2 className="text-lg font-semibold">Remove access</h2>
          <p className="text-base text-muted-foreground">
            For someone leaving the team. It takes effect at once: their
            sessions, passkeys and recovery codes are removed, and it&apos;s
            recorded.
          </p>
          {isOwner && (
            <Field
              id="remove-confirm"
              name="confirmEmail"
              label="Type their email to remove an Owner"
              type="email"
              required
            />
          )}
          <Button
            type="submit"
            variant="destructive"
            className={BUTTON}
            disabled={action.busy}
          >
            Remove access now
          </Button>
        </form>
      )}
    </div>
  )
}
