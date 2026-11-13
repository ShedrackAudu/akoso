"use client"

// The school's own roles (sign-in part B, section 2): create and change them from the
// permissions Akoso offers, archive or delete them, and choose which built-in roles
// must use a second step. The server enforces every rule; this screen only explains.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import type { CustomRole } from "@akoso/core/identity"
import {
  MFA_REQUIRED_ROLES,
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
  archiveCustomRoleAction,
  deleteCustomRoleAction,
  saveCustomRoleAction,
  setSchoolMfaRolesAction,
} from "@/server/actions/identity"

import { permissionName } from "./permission-names"

const BUTTON = "h-11 text-base"
const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"
const CHECK = "flex min-h-11 items-center gap-3 text-base"

export interface RolesEditorProps {
  school: string
  roles: CustomRole[]
  mfaRoles: string[]
  offered: string[]
  restricted: string[]
  held: string[]
  isProprietor: boolean
  identity: { hasPassword: boolean; account: string }
}

export function RolesEditor({
  school,
  roles,
  mfaRoles,
  offered,
  restricted,
  held,
  isProprietor,
  identity,
}: RolesEditorProps): JSX.Element {
  const router = useRouter()
  const action = useGuardedAction(identity)
  const [editing, setEditing] = useState<CustomRole | "new" | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const heldSet = new Set(held)
  const restrictedSet = new Set(restricted)

  const done = (message: string) => {
    setNotice(message)
    setEditing(null)
    router.refresh()
  }

  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      school,
      ...(editing !== null && editing !== "new" ? { id: editing.id } : {}),
      name: fieldText(form, "name"),
      description: fieldText(form, "description"),
      permissions: form.getAll("permissions").map(String),
      requiresMfa: form.get("requiresMfa") === "on",
    }
    void action.run(saveCustomRoleAction, input, () => {
      done("Role saved.")
    })
  }

  const archive = (role: CustomRole) => {
    void action.run(
      archiveCustomRoleAction,
      { school, id: role.id, archived: !role.archived },
      () => {
        done(role.archived ? "Role restored." : "Role archived.")
      }
    )
  }

  const remove = (role: CustomRole) => {
    void action.run(deleteCustomRoleAction, { school, id: role.id }, () => {
      done("Role deleted.")
    })
  }

  const saveMfaRoles = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = { school, roles: form.getAll("roles").map(String) }
    void action.run(setSchoolMfaRolesAction, input, () => {
      done(
        "Saved. People in these roles set up a second step at their next sign-in."
      )
    })
  }

  const current = editing === null || editing === "new" ? null : editing

  return (
    <div className="flex flex-col gap-6">
      {notice !== null && (
        <p role="status" className="text-base" data-testid="roles-notice">
          {notice}
        </p>
      )}
      <ProblemText problem={action.problem} />
      {action.confirm}

      <section className={SECTION}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">School roles</h2>
          <Button
            type="button"
            className={BUTTON}
            onClick={() => {
              setEditing("new")
            }}
          >
            New role
          </Button>
        </div>
        {roles.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No school roles yet. Make one, such as "Exams officer", from the
            permissions below.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {roles.map((role) => (
              <li
                key={role.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid="custom-role"
              >
                <span className="flex flex-col">
                  <span className="text-base font-semibold">
                    {role.name}
                    {role.archived ? " (archived)" : ""}
                  </span>
                  <span className="text-base text-muted-foreground">
                    {role.holders === 1
                      ? "1 person"
                      : `${String(role.holders)} people`}
                    {role.requiresMfa ? " · second step required" : ""}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={BUTTON}
                    onClick={() => {
                      setEditing(role)
                    }}
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={BUTTON}
                    disabled={action.busy}
                    onClick={() => {
                      archive(role)
                    }}
                  >
                    {role.archived ? "Restore" : "Archive"}
                  </Button>
                  {role.holders === 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      className={BUTTON}
                      disabled={action.busy}
                      onClick={() => {
                        remove(role)
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing !== null && (
        <form onSubmit={save} className={SECTION} key={current?.id ?? "new"}>
          <h2 className="text-lg font-semibold">
            {current === null ? "New role" : `Change ${current.name}`}
          </h2>
          <Field
            id="role-name"
            name="name"
            label="Name"
            defaultValue={current?.name ?? ""}
            maxLength={60}
            required
          />
          <Field
            id="role-description"
            name="description"
            label="What this role is for (optional)"
            defaultValue={current?.description ?? ""}
            maxLength={300}
          />
          <fieldset className="flex flex-col">
            <legend className="text-base font-semibold">Permissions</legend>
            {offered.map((permission) => {
              const isRestricted = restrictedSet.has(permission)
              const allowed =
                isProprietor || (!isRestricted && heldSet.has(permission))
              const has = current?.permissions.includes(permission) ?? false
              return (
                <label key={permission} className={CHECK}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    className="size-5"
                    defaultChecked={has}
                    // Keep what the role already has even if you couldn't add it.
                    disabled={!allowed && !has}
                  />
                  {/* A disabled box is not sent: keep the permission explicitly. */}
                  {!allowed && has && (
                    <input
                      type="hidden"
                      name="permissions"
                      value={permission}
                    />
                  )}
                  <span>
                    {permissionName(permission)}
                    {isRestricted ? " (only the proprietor can add this)" : ""}
                  </span>
                </label>
              )
            })}
          </fieldset>
          <label className={CHECK}>
            <input
              type="checkbox"
              name="requiresMfa"
              className="size-5"
              defaultChecked={current?.requiresMfa ?? false}
            />
            People with this role must use a second sign-in step
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className={BUTTON} disabled={action.busy}>
              Save role
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON}
              onClick={() => {
                setEditing(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={saveMfaRoles} className={SECTION}>
        <h2 className="text-lg font-semibold">Second sign-in step</h2>
        <p className="text-base text-muted-foreground">
          Proprietors, school administrators and bursars always use one. Choose
          any other roles that must.
        </p>
        <fieldset className="flex flex-col">
          <legend className="sr-only">Roles that must use a second step</legend>
          {ROLE_KEYS.filter((role: RoleKey) => role !== "guardian").map(
            (role) => {
              const always = MFA_REQUIRED_ROLES.has(role)
              return (
                <label key={role} className={CHECK}>
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    className="size-5"
                    defaultChecked={always || mfaRoles.includes(role)}
                    disabled={always}
                  />
                  {ROLE_LABELS[role]}
                  {always ? " (always)" : ""}
                </label>
              )
            }
          )}
        </fieldset>
        <Button type="submit" className={BUTTON} disabled={action.busy}>
          Save
        </Button>
      </form>
    </div>
  )
}
