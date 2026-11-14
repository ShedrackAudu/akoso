"use client"

// Setup step 2, the session and its terms (school setup part A spec, section 3). Each
// school enters its own dates; nothing comes from a built-in state calendar. The server
// checks the order rules and explains anything wrong in plain words.
import { useState, type JSX, type SyntheticEvent } from "react"

import type { AcademicSession, Term } from "@akoso/core/school-setup"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import {
  makeSessionCurrentAction,
  saveSessionAction,
  saveTermsAction,
} from "@/server/actions/school-setup"

import {
  ActionStatus,
  BUTTON,
  SECTION,
  useSetupAction,
  type SetupAction,
} from "./controls"

const STATUS_LABELS = {
  current: "Current session",
  planned: "Next session, being prepared",
  closed: "Closed",
} as const

/** "2026/2027" for a school day in the session that starts that September. */
function suggestedName(today: string): string {
  const year = Number(today.slice(0, 4))
  const start = Number(today.slice(5, 7)) >= 9 ? year : year - 1
  return `${String(start)}/${String(start + 1)}`
}

function SessionForm({
  school,
  action,
  session,
  suggested,
  onDone,
}: {
  school: string
  action: SetupAction
  session: AcademicSession | null
  suggested: string
  onDone?: () => void
}): JSX.Element {
  const id = session?.id ?? "new"
  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action.run(
      saveSessionAction,
      {
        school,
        ...(session === null
          ? {}
          : { id: session.id, version: session.version }),
        name: fieldText(form, "name"),
        startsOn: fieldText(form, "startsOn"),
        endsOn: fieldText(form, "endsOn"),
      },
      () => {
        onDone?.()
        return session === null ? "Session added." : "Session saved."
      }
    )
  }
  return (
    <SafeForm
      onSubmit={save}
      className="flex flex-col gap-4"
      aria-label={session === null ? "New session" : `Session ${session.name}`}
    >
      <Field
        id={`session-${id}-name`}
        name="name"
        label="Session"
        defaultValue={session?.name ?? suggested}
        placeholder="2026/2027"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`session-${id}-starts`}
          name="startsOn"
          label="First day"
          type="date"
          defaultValue={session?.startsOn ?? ""}
          required
        />
        <Field
          id={`session-${id}-ends`}
          name="endsOn"
          label="Last day"
          type="date"
          defaultValue={session?.endsOn ?? ""}
          required
        />
      </div>
      <div>
        <Button type="submit" className={BUTTON} disabled={action.busy}>
          {session === null ? "Add session" : "Save session"}
        </Button>
      </div>
    </SafeForm>
  )
}

function TermFields({
  sessionId,
  number,
  term,
  readOnly,
}: {
  sessionId: string
  number: number
  term: Term | undefined
  readOnly: boolean
}): JSX.Element {
  const id = (field: string) => `term-${sessionId}-${String(number)}-${field}`
  return (
    <fieldset className="flex flex-col gap-4" disabled={readOnly}>
      <legend className="text-base font-semibold">
        Term {number}
        {term !== undefined && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · {term.schoolDays} school days
          </span>
        )}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id("starts")}
          name={`t${String(number)}-startsOn`}
          label="Starts"
          type="date"
          defaultValue={term?.startsOn ?? ""}
        />
        <Field
          id={id("ends")}
          name={`t${String(number)}-endsOn`}
          label="Ends"
          type="date"
          defaultValue={term?.endsOn ?? ""}
        />
        <Field
          id={id("mid-starts")}
          name={`t${String(number)}-midTermStartsOn`}
          label="Mid-term break starts (optional)"
          type="date"
          defaultValue={term?.midTermStartsOn ?? ""}
        />
        <Field
          id={id("mid-ends")}
          name={`t${String(number)}-midTermEndsOn`}
          label="Mid-term break ends (optional)"
          type="date"
          defaultValue={term?.midTermEndsOn ?? ""}
        />
        <Field
          id={id("resumes")}
          name={`t${String(number)}-resumesOn`}
          label={
            number === 3
              ? "Next session resumes (optional)"
              : `Term ${String(number + 1)} resumes (optional)`
          }
          type="date"
          defaultValue={term?.resumesOn ?? ""}
        />
      </div>
    </fieldset>
  )
}

function TermsForm({
  school,
  session,
}: {
  school: string
  session: AcademicSession
}): JSX.Element {
  // Its own outcome, shown next to its button: the terms form is long.
  const action = useSetupAction()
  const readOnly = session.status === "closed"
  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (number: number, field: string) =>
      fieldText(form, `t${String(number)}-${field}`)
    const optional = (number: number, field: string) => {
      const text = value(number, field)
      return text === "" ? null : text
    }
    const terms = [1, 2, 3]
      .filter(
        (number) =>
          value(number, "startsOn") !== "" || value(number, "endsOn") !== ""
      )
      .map((number) => ({
        number,
        startsOn: value(number, "startsOn"),
        endsOn: value(number, "endsOn"),
        midTermStartsOn: optional(number, "midTermStartsOn"),
        midTermEndsOn: optional(number, "midTermEndsOn"),
        resumesOn: optional(number, "resumesOn"),
      }))
    void action.run(
      saveTermsAction,
      { school, sessionId: session.id, terms, version: session.version },
      () => "Term dates saved."
    )
  }
  return (
    <SafeForm
      onSubmit={save}
      className="flex flex-col gap-6"
      aria-label={`Terms of ${session.name}`}
    >
      {[1, 2, 3].map((number) => (
        <TermFields
          key={number}
          sessionId={session.id}
          number={number}
          term={session.terms.find((term) => term.number === number)}
          readOnly={readOnly}
        />
      ))}
      <ActionStatus action={action} />
      {!readOnly && (
        <div>
          <Button type="submit" className={BUTTON} disabled={action.busy}>
            Save term dates
          </Button>
        </div>
      )}
    </SafeForm>
  )
}

export function SessionEditor({
  school,
  sessions,
  today,
}: {
  school: string
  sessions: AcademicSession[]
  today: string
}): JSX.Element {
  const action = useSetupAction()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const hasCurrent = sessions.some((session) => session.status === "current")
  const ordered = [...sessions].sort((a, b) =>
    a.status === b.status
      ? b.startsOn.localeCompare(a.startsOn)
      : a.status === "current"
        ? -1
        : b.status === "current"
          ? 1
          : 0
  )
  const suggested = suggestedName(today)

  return (
    <div className="flex flex-col gap-6">
      <ActionStatus action={action} />
      {sessions.length === 0 && (
        <section className={SECTION} aria-labelledby="first-session">
          <h2 id="first-session" className="text-lg font-semibold">
            This session
          </h2>
          <p className="text-base text-muted-foreground">
            Name the session and give its first and last day. Then add each
            term&apos;s dates.
          </p>
          <SessionForm
            school={school}
            action={action}
            session={null}
            suggested={suggested}
          />
        </section>
      )}

      {ordered.map((session) => (
        <section
          key={session.id}
          className={SECTION}
          aria-labelledby={`session-${session.id}`}
          data-testid="session"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h2
                id={`session-${session.id}`}
                className="text-lg font-semibold"
              >
                {session.name}
              </h2>
              <span className="text-base text-muted-foreground">
                {STATUS_LABELS[session.status]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.status !== "closed" && (
                <Button
                  type="button"
                  variant="outline"
                  className={BUTTON}
                  aria-expanded={editing === session.id}
                  onClick={() => {
                    setEditing(editing === session.id ? null : session.id)
                  }}
                >
                  Change session dates
                </Button>
              )}
              {session.status === "planned" && !hasCurrent && (
                <Button
                  type="button"
                  variant="outline"
                  className={BUTTON}
                  disabled={action.busy}
                  onClick={() => {
                    void action.run(
                      makeSessionCurrentAction,
                      { school, sessionId: session.id },
                      () => `${session.name} is now the current session.`
                    )
                  }}
                >
                  Make current
                </Button>
              )}
            </div>
          </div>
          {editing === session.id && (
            <SessionForm
              school={school}
              action={action}
              session={session}
              suggested={suggested}
              onDone={() => {
                setEditing(null)
              }}
            />
          )}
          <TermsForm school={school} session={session} />
        </section>
      ))}

      {sessions.length > 0 && (
        <section className={SECTION} aria-labelledby="next-session">
          <h2 id="next-session" className="text-lg font-semibold">
            Prepare the next session
          </h2>
          {adding ? (
            <SessionForm
              school={school}
              action={action}
              session={null}
              suggested=""
              onDone={() => {
                setAdding(false)
              }}
            />
          ) : (
            <div>
              <Button
                type="button"
                variant="outline"
                className={BUTTON}
                onClick={() => {
                  setAdding(true)
                }}
              >
                Add the next session
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
