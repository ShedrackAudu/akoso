"use client"

// Setup step 5, subjects (school setup part A spec, section 6): the school's subject
// list, and which subjects each arm takes. Arms are filled from the NERDC list for
// their class, curriculum and field; the school adjusts. Outside NERDC's 2025 range the
// screen warns and still saves.
import { useState, type JSX, type SyntheticEvent } from "react"

import type { SchoolClass, Subject } from "@akoso/core/school-setup"
import { schoolSetup } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import {
  applySubjectPresetsAction,
  archiveSubjectAction,
  saveSubjectAction,
  setArmSubjectsAction,
} from "@/server/actions/school-setup"

import {
  ActionStatus,
  BUTTON,
  CHECK,
  SECTION,
  SelectField,
  useSetupAction,
  type SetupAction,
} from "./controls"

const KIND_LABELS: Record<Subject["kind"], string> = {
  core: "Core",
  elective: "Elective",
  trade: "Trade subject",
  optional: "Optional",
}

function SubjectForm({
  school,
  action,
  subject,
  onDone,
}: {
  school: string
  action: SetupAction
  subject: Subject | null
  onDone: () => void
}): JSX.Element {
  const id = subject?.id ?? "new"
  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action.run(
      saveSubjectAction,
      {
        school,
        ...(subject === null
          ? {}
          : {
              id: subject.id,
              version: subject.version,
              nerdcKey: subject.nerdcKey,
            }),
        name: fieldText(form, "name"),
        code: fieldText(form, "code"),
        kind: fieldText(form, "kind"),
      },
      () => {
        onDone()
        return subject === null ? "Subject added." : "Subject saved."
      }
    )
  }
  return (
    <SafeForm
      onSubmit={save}
      className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4"
      aria-label={subject === null ? "New subject" : `Edit ${subject.name}`}
    >
      <Field
        id={`subject-${id}-name`}
        name="name"
        label="Subject name"
        defaultValue={subject?.name ?? ""}
        required
        maxLength={80}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`subject-${id}-code`}
          name="code"
          label="Short code"
          defaultValue={subject?.code ?? ""}
          placeholder="MTH"
          required
          maxLength={8}
        />
        <SelectField
          id={`subject-${id}-kind`}
          name="kind"
          label="Kind"
          defaultValue={subject?.kind ?? "core"}
        >
          {Object.entries(KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={BUTTON} disabled={action.busy}>
          {subject === null ? "Add subject" : "Save subject"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={BUTTON}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </SafeForm>
  )
}

function ArmSubjects({
  school,
  entry,
  armIndex,
  subjects,
}: {
  school: string
  entry: SchoolClass
  armIndex: number
  subjects: Subject[]
}): JSX.Element | null {
  const action = useSetupAction()
  const arm = entry.arms[armIndex]
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(arm?.subjectIds ?? [])
  )
  if (arm === undefined) return null
  const limits = schoolSetup.subjectLimits(entry.standardClass, arm.curriculum)
  // An archived subject the arm still takes stays listed, so it can be taken off.
  const offered = subjects.filter(
    (subject) => !subject.archived || arm.subjectIds.includes(subject.id)
  )
  const label = `${entry.name} ${arm.name}`

  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    void action.run(
      setArmSubjectsAction,
      { school, armId: arm.id, subjectIds: [...chosen] },
      (data) => data.warning ?? `Subjects saved for ${label}.`
    )
  }

  return (
    <details
      className="rounded-md border border-border"
      data-testid="arm-subjects"
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-base">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {arm.subjectIds.length} subjects
        </span>
      </summary>
      <SafeForm
        onSubmit={save}
        className="flex flex-col gap-3 border-t border-border p-3"
        aria-label={`Subjects for ${label}`}
      >
        <p className="text-base text-muted-foreground">
          {schoolSetup.CURRICULUM_LABELS[arm.curriculum]}
          {limits !== null && (
            <>
              : NERDC lists {limits.min} to {limits.max} subjects.
            </>
          )}
        </p>
        <fieldset className="grid sm:grid-cols-2">
          <legend className="sr-only">Subjects {label} takes</legend>
          {offered.map((subject) => (
            <label key={subject.id} className={CHECK}>
              <input
                type="checkbox"
                className="size-5"
                checked={chosen.has(subject.id)}
                onChange={(event) => {
                  const next = new Set(chosen)
                  if (event.target.checked) next.add(subject.id)
                  else next.delete(subject.id)
                  setChosen(next)
                }}
              />
              {subject.name}
              {subject.archived && " (archived)"}
            </label>
          ))}
        </fieldset>
        <p className="text-base" aria-live="polite">
          {chosen.size} chosen
        </p>
        <ActionStatus action={action} />
        <div>
          <Button type="submit" className={BUTTON} disabled={action.busy}>
            Save subjects for {label}
          </Button>
        </div>
      </SafeForm>
    </details>
  )
}

export function SubjectsEditor({
  school,
  subjects,
  classes,
}: {
  school: string
  subjects: Subject[]
  classes: SchoolClass[]
}): JSX.Element {
  const action = useSetupAction()
  const [editing, setEditing] = useState<string | null>(null)
  const close = () => {
    setEditing(null)
  }
  const live = subjects.filter((subject) => !subject.archived)
  const emptyArms = classes
    .flatMap((entry) => entry.arms)
    .filter((arm) => arm.subjectIds.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <ActionStatus action={action} />

      {emptyArms.length > 0 && (
        <section className={SECTION} aria-labelledby="presets">
          <h2 id="presets" className="text-lg font-semibold">
            Fill arms from the NERDC lists
          </h2>
          <p className="text-base text-muted-foreground">
            {emptyArms.length === 1
              ? "One arm has"
              : `${String(emptyArms.length)} arms have`}{" "}
            no subjects yet. Each gets the NERDC list for its class, curriculum
            and field of study. Nursery arms and arms on your own curriculum are
            left for you to fill.
          </p>
          <div>
            <Button
              type="button"
              className={BUTTON}
              disabled={action.busy}
              onClick={() => {
                void action.run(
                  applySubjectPresetsAction,
                  { school },
                  (data) =>
                    data.arms === 0
                      ? "No arm has a NERDC list to fill from."
                      : `${String(data.arms)} arms filled; ${String(data.subjectsCreated)} subjects added to your list.`
                )
              }}
            >
              Fill from the NERDC lists
            </Button>
          </div>
        </section>
      )}

      <section className={SECTION} aria-labelledby="subject-list">
        <h2 id="subject-list" className="text-lg font-semibold">
          Your subjects
        </h2>
        {live.length === 0 ? (
          <p className="text-base text-muted-foreground">No subjects yet.</p>
        ) : (
          <ul
            className="flex flex-col divide-y divide-border"
            data-testid="subject-list"
          >
            {live.map((subject) => (
              <li key={subject.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="text-base font-semibold">
                      {subject.name}
                    </span>
                    <span className="text-base text-muted-foreground">
                      {subject.code} · {KIND_LABELS[subject.kind]}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={BUTTON}
                      onClick={() => {
                        setEditing(subject.id)
                      }}
                    >
                      Edit<span className="sr-only"> {subject.name}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className={BUTTON}
                      disabled={action.busy}
                      onClick={() => {
                        void action.run(
                          archiveSubjectAction,
                          { school, id: subject.id },
                          () =>
                            `${subject.name} archived. Arms that take it keep it; new arms can't choose it.`
                        )
                      }}
                    >
                      Archive<span className="sr-only"> {subject.name}</span>
                    </Button>
                  </span>
                </div>
                {editing === subject.id && (
                  <SubjectForm
                    school={school}
                    action={action}
                    subject={subject}
                    onDone={close}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {editing === "new" ? (
          <SubjectForm
            school={school}
            action={action}
            subject={null}
            onDone={close}
          />
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              className={BUTTON}
              onClick={() => {
                setEditing("new")
              }}
            >
              Add a subject
            </Button>
          </div>
        )}
      </section>

      {classes.length > 0 && (
        <section className={SECTION} aria-labelledby="arm-subjects">
          <h2 id="arm-subjects" className="text-lg font-semibold">
            Subjects for each arm
          </h2>
          <div className="flex flex-col gap-2">
            {classes.flatMap((entry) =>
              entry.arms.map((arm, index) => (
                <ArmSubjects
                  key={arm.id}
                  school={school}
                  entry={entry}
                  armIndex={index}
                  subjects={subjects}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}
