"use client"

// Inviting someone to the team (sign-in part B, section 8). The link is shown once, for
// the Owner to pass on; it works once, for 24 hours.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import { TEAM_ROLE_KEYS, TEAM_ROLE_LABELS } from "@akoso/schemas/permissions"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { inviteTeamMemberAction } from "@/server/actions"

import { Field } from "./field"
import { ErrorText, useTeamAction } from "./use-team-action"

const text = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

export function InviteForm(): JSX.Element {
  const router = useRouter()
  const action = useTeamAction()
  const [link, setLink] = useState<string | null>(null)
  const [owner, setOwner] = useState(false)

  const invite = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await action.run(inviteTeamMemberAction, {
      name: text(form, "name"),
      email: text(form, "email"),
      roles: form.getAll("roles").map(String),
      confirmEmail: text(form, "confirmEmail"),
    })
    if (result === null) return
    setLink(result.link)
    router.refresh()
  }

  return (
    <SafeForm
      onSubmit={(event) => void invite(event)}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h2 className="text-lg font-semibold">Invite someone</h2>
      <Field id="invite-name" name="name" label="Name" required />
      <Field
        id="invite-email"
        name="email"
        label="Email"
        type="email"
        required
      />
      <fieldset className="flex flex-col">
        <legend className="text-base font-semibold">Roles</legend>
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
              onChange={
                role === "owner"
                  ? (event) => {
                      setOwner(event.target.checked)
                    }
                  : undefined
              }
            />
            {TEAM_ROLE_LABELS[role]}
          </label>
        ))}
      </fieldset>
      {owner && (
        <Field
          id="invite-confirm"
          name="confirmEmail"
          label="Type their email again to give them the Owner role"
          type="email"
          required
        />
      )}
      <Button type="submit" className="h-11 text-base" disabled={action.busy}>
        Make invitation link
      </Button>
      <ErrorText error={action.error} />
      {link !== null && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-base">
            Send this link to them yourself. It works once, for 24 hours, and
            won&apos;t be shown again.
          </p>
          <code
            className="rounded-md bg-muted p-3 text-base break-all"
            data-testid="invitation-link"
          >
            {link}
          </code>
        </div>
      )}
    </SafeForm>
  )
}
