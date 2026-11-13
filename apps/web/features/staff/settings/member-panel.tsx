"use client"

// One person's access (sign-in part B): their roles, suspending them, and the school's
// help when they lose their number or authenticator, after a recorded identity check.
// The server enforces every rule; this screen only hides what can't be done.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import type { MemberSummary } from "@akoso/core/identity"
import {
  CONTACT_CHANGE_REASONS,
  IDENTITY_CHECK_METHODS,
  IDENTITY_EVIDENCE,
} from "@akoso/schemas/identity"
import {
  PROPRIETOR_GRANTED_ROLES,
  ROLE_KEYS,
  ROLE_LABELS,
  type RoleKey,
} from "@akoso/schemas/permissions"
import { Button } from "@akoso/ui/components/button"

import {
  ProblemText,
  useGuardedAction,
} from "@/features/shared/actions/use-guarded-action"
import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import {
  changeRolesAction,
  confirmNumberChangeAction,
  resetMemberMfaAction,
  setMembershipStatusAction,
  startNumberChangeAction,
} from "@/server/actions/identity"

const BUTTON = "h-11 text-base"
const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"
const CHECK = "flex min-h-11 items-center gap-3 text-base"
const SELECT =
  "h-11 rounded-md border border-border bg-background px-3 text-base"

const METHOD_LABELS = { in_person: "In person", video_call: "By video call" }
const EVIDENCE_LABELS = {
  parent_id: "A parent's ID card",
  child_details: "Their child's details",
  staff_id: "A staff ID",
  other: "Something else (say what in the note)",
}
const REASON_LABELS = {
  sim_lost: "Lost their SIM or phone",
  number_changed: "Changed their number",
  authenticator_lost: "Lost their authenticator app",
  other: "Something else (say what in the note)",
}

export interface MemberPanelProps {
  school: string
  member: MemberSummary
  customRoles: { id: string; name: string; archived: boolean }[]
  identity: { hasPassword: boolean; account: string }
  isSelf: boolean
  may: {
    manage: boolean
    changeNumber: boolean
    resetMfa: boolean
    proprietor: boolean
  }
}

/** The identity-check questions both recovery forms ask (sections 5 and 6). */
function IdentityCheckFields({ prefix }: { prefix: string }): JSX.Element {
  return (
    <>
      <label className="flex flex-col gap-2 text-base">
        How did you check who they are?
        <select
          name="checkMethod"
          required
          className={SELECT}
          id={`${prefix}-method`}
        >
          {IDENTITY_CHECK_METHODS.map((value) => (
            <option key={value} value={value}>
              {METHOD_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        What did you see?
        <select
          name="evidence"
          required
          className={SELECT}
          id={`${prefix}-evidence`}
        >
          {IDENTITY_EVIDENCE.map((value) => (
            <option key={value} value={value}>
              {EVIDENCE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base">
        Why?
        <select
          name="reason"
          required
          className={SELECT}
          id={`${prefix}-reason`}
        >
          {CONTACT_CHANGE_REASONS.map((value) => (
            <option key={value} value={value}>
              {REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <Field
        id={`${prefix}-note`}
        name="note"
        label="Note (optional; never an ID number)"
        maxLength={300}
      />
    </>
  )
}

const checkFrom = (form: FormData) => ({
  checkMethod: fieldText(form, "checkMethod"),
  evidence: fieldText(form, "evidence"),
  reason: fieldText(form, "reason"),
  note: fieldText(form, "note"),
})

export function MemberPanel({
  school,
  member,
  customRoles,
  identity,
  isSelf,
  may,
}: MemberPanelProps): JSX.Element {
  const router = useRouter()
  const action = useGuardedAction(identity)
  const [notice, setNotice] = useState<string | null>(null)
  const [change, setChange] = useState<{
    changeId: string
    phone: string
  } | null>(null)
  const touchesManagers = member.roles.some((role) =>
    PROPRIETOR_GRANTED_ROLES.has(role)
  )
  const canEdit = may.manage && !isSelf && (may.proprietor || !touchesManagers)

  const done = (message: string) => {
    setNotice(message)
    router.refresh()
  }

  const saveRoles = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      school,
      membershipId: member.membershipId,
      roles: form.getAll("roles").map(String),
      customRoleIds: form.getAll("customRoleIds").map(String),
    }
    void action.run(changeRolesAction, input, () => {
      done(
        "Roles saved. They've been signed out, so the change applies at once."
      )
    })
  }

  const setStatus = (status: "active" | "suspended") => {
    const input = { school, membershipId: member.membershipId, status }
    void action.run(setMembershipStatusAction, input, () => {
      done(status === "suspended" ? "Access suspended." : "Access restored.")
    })
  }

  const startChange = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const phone = fieldText(form, "phone")
    const input = {
      school,
      membershipId: member.membershipId,
      phone,
      ...checkFrom(form),
    }
    void action.run(startNumberChangeAction, input, (data) => {
      setChange({ changeId: data.changeId, phone })
    })
  }

  const confirmChange = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (change === null) return
    const code = fieldText(new FormData(event.currentTarget), "code")
    void action.run(
      confirmNumberChangeAction,
      { school, ...change, code },
      () => {
        setChange(null)
        done(
          "Their sign-in number is changed, and their old number has been told."
        )
      }
    )
  }

  const resetMfa = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      school,
      membershipId: member.membershipId,
      ...checkFrom(form),
    }
    void action.run(resetMemberMfaAction, input, () => {
      done(
        "Their second step is reset. They'll set it up again when they next sign in."
      )
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {notice !== null && (
        <p role="status" className="text-base" data-testid="member-notice">
          {notice}
        </p>
      )}
      <ProblemText problem={action.problem} />
      {action.confirm}

      {isSelf && (
        <p className="text-base text-muted-foreground">
          This is you. Another proprietor or administrator can change your
          access.
        </p>
      )}

      <form onSubmit={saveRoles} className={SECTION}>
        <h2 className="text-lg font-semibold">Roles</h2>
        <fieldset className="flex flex-col" disabled={!canEdit}>
          <legend className="sr-only">Built-in roles</legend>
          {ROLE_KEYS.map((role: RoleKey) => (
            <label key={role} className={CHECK}>
              <input
                type="checkbox"
                name="roles"
                value={role}
                className="size-5"
                defaultChecked={member.roles.includes(role)}
                disabled={PROPRIETOR_GRANTED_ROLES.has(role) && !may.proprietor}
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </fieldset>
        {customRoles.length > 0 && (
          <fieldset className="flex flex-col" disabled={!canEdit}>
            <legend className="text-base font-semibold">School roles</legend>
            {customRoles.map((role) => (
              <label key={role.id} className={CHECK}>
                <input
                  type="checkbox"
                  name="customRoleIds"
                  value={role.id}
                  className="size-5"
                  defaultChecked={member.customRoles.some(
                    (held) => held.id === role.id
                  )}
                />
                {role.name}
                {role.archived ? " (archived)" : ""}
              </label>
            ))}
          </fieldset>
        )}
        {canEdit && (
          <Button type="submit" className={BUTTON} disabled={action.busy}>
            Save roles
          </Button>
        )}
      </form>

      {canEdit && (
        <section className={SECTION}>
          <h2 className="text-lg font-semibold">Access</h2>
          {member.status === "active" ? (
            <Button
              type="button"
              variant="destructive"
              className={BUTTON}
              disabled={action.busy}
              onClick={() => {
                setStatus("suspended")
              }}
            >
              Suspend access
            </Button>
          ) : (
            <Button
              type="button"
              className={BUTTON}
              disabled={action.busy}
              onClick={() => {
                setStatus("active")
              }}
            >
              Restore access
            </Button>
          )}
        </section>
      )}

      {may.changeNumber && !isSelf && !member.mfaEnabled && (
        <section className={SECTION}>
          <h2 className="text-lg font-semibold">Change sign-in number</h2>
          <p className="text-base text-muted-foreground">
            For someone who has lost the number they sign in with. Check who
            they are in person or by video call first. Their old number will be
            told.
          </p>
          {change === null ? (
            <form onSubmit={startChange} className="flex flex-col gap-4">
              <IdentityCheckFields prefix="number" />
              <Field
                id="number-phone"
                name="phone"
                label="Their new phone number"
                type="tel"
                inputMode="tel"
                required
              />
              <Button type="submit" className={BUTTON} disabled={action.busy}>
                Send a code to the new number
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmChange} className="flex flex-col gap-4">
              <Field
                id="number-code"
                name="code"
                label={`Ask them for the code sent to ${change.phone}`}
                inputMode="numeric"
                autoComplete="off"
                required
              />
              <Button type="submit" className={BUTTON} disabled={action.busy}>
                Change number
              </Button>
            </form>
          )}
        </section>
      )}

      {may.resetMfa && !isSelf && member.mfaEnabled && (
        <form onSubmit={resetMfa} className={SECTION}>
          <h2 className="text-lg font-semibold">Reset second sign-in step</h2>
          <p className="text-base text-muted-foreground">
            For someone who has lost their authenticator app and backup codes.
            Check who they are first. They'll set it up again at their next
            sign-in.
          </p>
          <IdentityCheckFields prefix="mfa" />
          <Button
            type="submit"
            variant="destructive"
            className={BUTTON}
            disabled={action.busy}
          >
            Reset second step
          </Button>
        </form>
      )}
    </div>
  )
}
