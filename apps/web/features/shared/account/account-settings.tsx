"use client"

// My account (sign-in part B, sections 4 and 7): name, sign-in number, backup number,
// email for staff, and deleting the account.
import { useRouter } from "next/navigation"
import { useState, type JSX, type SyntheticEvent } from "react"

import type { MyAccount } from "@akoso/core/identity"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import {
  confirmBackupPhoneAction,
  confirmPhoneChangeAction,
  deleteAccountAction,
  removeBackupPhoneAction,
  requestBackupPhoneAction,
  requestEmailChangeAction,
  requestPhoneChangeAction,
  updateNameAction,
} from "@/server/actions/identity"

import { ProblemText, useGuardedAction } from "../actions/use-guarded-action"
import { fieldText } from "../auth/auth-client"
import { Field } from "../auth/field"

const SECTION = "flex flex-col gap-4 rounded-lg border border-border p-4"

const formText = (event: SyntheticEvent<HTMLFormElement>, name: string) =>
  fieldText(new FormData(event.currentTarget), name)

export function AccountSettings({
  account,
  hasPassword,
}: {
  account: MyAccount
  hasPassword: boolean
}): JSX.Element {
  const router = useRouter()
  const identity = {
    hasPassword,
    account: (hasPassword ? account.email : null) ?? account.phone ?? "",
  }
  const action = useGuardedAction(identity)
  const [notice, setNotice] = useState<string | null>(null)
  const [phoneStep, setPhoneStep] = useState<string | null>(null)
  const [backupStep, setBackupStep] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const done = (message: string) => {
    setNotice(message)
    router.refresh()
  }

  const saveName = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = formText(event, "name")
    void action.run(updateNameAction, { name }, () => {
      done("Your name is saved.")
    })
  }

  const startPhoneChange = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const phone = formText(event, "phone")
    void action.run(requestPhoneChangeAction, { phone }, () => {
      setPhoneStep(phone)
    })
  }

  const finishPhoneChange = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (phoneStep === null) return
    const input = {
      phone: phoneStep,
      newCode: formText(event, "newCode"),
      oldCode: formText(event, "oldCode"),
    }
    void action.run(confirmPhoneChangeAction, input, () => {
      // Every session ends when the number changes, this one too.
      router.push("/sign-in")
    })
  }

  const startBackup = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const phone = formText(event, "phone")
    void action.run(requestBackupPhoneAction, { phone }, () => {
      setBackupStep(phone)
    })
  }

  const finishBackup = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (backupStep === null) return
    const code = formText(event, "code")
    void action.run(
      confirmBackupPhoneAction,
      { phone: backupStep, code },
      () => {
        setBackupStep(null)
        done("Your backup number is added.")
      }
    )
  }

  const removeBackup = () => {
    void action.run(removeBackupPhoneAction, {}, () => {
      done("Your backup number is removed.")
    })
  }

  const changeEmail = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = formText(event, "email")
    void action.run(requestEmailChangeAction, { email }, () => {
      setNotice(
        `We've sent a link to ${email}. Open it within 24 hours to use that email.`
      )
    })
  }

  const deleteAccount = () => {
    void action.run(deleteAccountAction, { confirm: true }, () => {
      router.push("/sign-in")
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {notice !== null && (
        <p role="status" className="text-sm" data-testid="account-notice">
          {notice}
        </p>
      )}
      <ProblemText problem={action.problem} />
      {action.confirm}

      <SafeForm onSubmit={saveName} className={SECTION}>
        <h2 className="text-lg font-semibold">Your name</h2>
        <Field
          id="name"
          name="name"
          label="Name shown to your schools"
          defaultValue={account.name}
          autoComplete="name"
          required
        />
        <Button type="submit" disabled={action.busy}>
          Save name
        </Button>
      </SafeForm>

      {account.phone !== null && (
        <section className={SECTION}>
          <h2 className="text-lg font-semibold">Sign-in number</h2>
          <p className="text-sm">{account.phone}</p>
          {phoneStep === null ? (
            <SafeForm
              onSubmit={startPhoneChange}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-muted-foreground">
                Still have this phone? Move your sign-in to a new number. If
                you've lost it, ask your school office.
              </p>
              <Field
                id="new-phone"
                name="phone"
                label="New phone number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
              />
              <Button type="submit" disabled={action.busy}>
                Send codes
              </Button>
            </SafeForm>
          ) : (
            <SafeForm
              onSubmit={finishPhoneChange}
              className="flex flex-col gap-4"
            >
              <Field
                id="new-code"
                name="newCode"
                label={`Code sent to ${phoneStep}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              <Field
                id="old-code"
                name="oldCode"
                label={`Code sent to ${account.phone}`}
                inputMode="numeric"
                required
              />
              <Button type="submit" disabled={action.busy}>
                Change number
              </Button>
            </SafeForm>
          )}
        </section>
      )}

      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Backup number</h2>
        <p className="text-sm text-muted-foreground">
          A second number you can sign in with if you lose your phone.
        </p>
        {account.backupPhone !== null ? (
          <>
            <p className="text-sm" data-testid="backup-phone">
              {account.backupPhone}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={removeBackup}
            >
              Remove backup number
            </Button>
          </>
        ) : backupStep === null ? (
          <SafeForm onSubmit={startBackup} className="flex flex-col gap-4">
            <Field
              id="backup-phone"
              name="phone"
              label="Backup phone number"
              type="tel"
              inputMode="tel"
              required
            />
            <Button type="submit" disabled={action.busy}>
              Send code
            </Button>
          </SafeForm>
        ) : (
          <SafeForm onSubmit={finishBackup} className="flex flex-col gap-4">
            <Field
              id="backup-code"
              name="code"
              label={`Code sent to ${backupStep}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" disabled={action.busy}>
              Add backup number
            </Button>
          </SafeForm>
        )}
      </section>

      {account.isStaff && (
        <SafeForm onSubmit={changeEmail} className={SECTION}>
          <h2 className="text-lg font-semibold">Email</h2>
          <p className="text-sm">{account.email ?? "No email yet"}</p>
          <Field
            id="email"
            name="email"
            label="New email"
            type="email"
            autoComplete="email"
            required
          />
          <Button type="submit" disabled={action.busy}>
            Send confirmation link
          </Button>
        </SafeForm>
      )}

      <section className={SECTION}>
        <h2 className="text-lg font-semibold">Delete my account</h2>
        <p className="text-sm text-muted-foreground">
          Your sign-in is deleted and you can't sign in again. Your schools keep
          their own records about you and your children, such as fees and
          results, as the law allows. Ask each school if you want those removed.
        </p>
        <label className="flex min-h-8 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5"
            checked={confirmDelete}
            onChange={(event) => {
              setConfirmDelete(event.target.checked)
            }}
          />
          I understand this can't be undone
        </label>
        <Button
          type="button"
          variant="destructive"
          disabled={!confirmDelete || action.busy}
          onClick={deleteAccount}
        >
          Delete my account
        </Button>
      </section>
    </div>
  )
}
