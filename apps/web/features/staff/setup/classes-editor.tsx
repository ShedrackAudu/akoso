"use client"

// Setup step 4, classes and arms (school setup part A spec, section 5). The usual
// classes for the school's type come first; the school then renames, reorders, adds
// and removes. Each arm has its own curriculum version, so Primary 4 can follow the
// 2025 curriculum while Primary 6 stays on the old one.
import { useState, type JSX, type SyntheticEvent } from "react"

import type { ClassArm, SchoolClass } from "@akoso/core/school-setup"
import { schoolSetup } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import {
  createDefaultClassesAction,
  moveClassAction,
  removeArmAction,
  removeClassAction,
  saveArmAction,
  saveClassAction,
} from "@/server/actions/school-setup"

import {
  ActionStatus,
  BUTTON,
  SECTION,
  SelectField,
  useSetupAction,
  type SetupAction,
} from "./controls"

type Stage = schoolSetup.Stage

type Editing =
  | { kind: "class"; id: string | null; stage: Stage }
  | { kind: "arm"; classId: string; id: string | null }
  | { kind: "remove-class"; id: string }
  | { kind: "remove-arm"; id: string }
  | null

const STAGES = Object.keys(schoolSetup.STAGE_LABELS) as Stage[]

const standardLabel = (key: string | null): string =>
  schoolSetup.STANDARD_CLASSES.find((entry) => entry.key === key)?.label ?? ""

function armSummary(arm: ClassArm): string {
  const parts: string[] = [schoolSetup.CURRICULUM_LABELS[arm.curriculum]]
  if (arm.track !== null) parts.push(schoolSetup.TRACK_LABELS[arm.track])
  return parts.join(" · ")
}

function ClassForm({
  school,
  action,
  entry,
  stage,
  onDone,
}: {
  school: string
  action: SetupAction
  entry: SchoolClass | null
  stage: Stage
  onDone: () => void
}): JSX.Element {
  const id = entry?.id ?? `new-${stage}`
  const [chosenStage, setChosenStage] = useState<Stage>(entry?.stage ?? stage)
  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const standard = fieldText(form, "standardClass")
    void action.run(
      saveClassAction,
      {
        school,
        ...(entry === null ? {} : { id: entry.id, version: entry.version }),
        stage: chosenStage,
        name: fieldText(form, "name"),
        standardClass: standard === "" ? null : standard,
      },
      () => {
        onDone()
        return entry === null ? "Class added." : "Class saved."
      }
    )
  }
  return (
    <SafeForm
      onSubmit={save}
      className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4"
      aria-label={entry === null ? "New class" : `Edit ${entry.name}`}
    >
      <Field
        id={`class-${id}-name`}
        name="name"
        label="Class name"
        defaultValue={entry?.name ?? ""}
        placeholder="Basic 7"
        required
        maxLength={60}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`class-${id}-stage`}
          name="stage"
          label="Level"
          value={chosenStage}
          onChange={(event) => {
            setChosenStage(event.target.value as Stage)
          }}
        >
          {STAGES.map((value) => (
            <option key={value} value={value}>
              {schoolSetup.STAGE_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={`class-${id}-standard`}
          name="standardClass"
          label="Standard class"
          defaultValue={entry?.standardClass ?? ""}
          aria-describedby={`class-${id}-standard-hint`}
        >
          <option value="">None</option>
          {schoolSetup.STANDARD_CLASSES.filter(
            (option) => option.stage === chosenStage
          ).map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
      <p
        id={`class-${id}-standard-hint`}
        className="-mt-2 text-base text-muted-foreground"
      >
        Which class this is in the national system, whatever you call it. The
        NERDC subject lists use it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={BUTTON} disabled={action.busy}>
          {entry === null ? "Add class" : "Save class"}
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

function ArmForm({
  school,
  action,
  entry,
  arm,
  onDone,
}: {
  school: string
  action: SetupAction
  entry: SchoolClass
  arm: ClassArm | null
  onDone: () => void
}): JSX.Element {
  const id = arm?.id ?? `new-${entry.id}`
  const senior = entry.stage === "senior"
  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const track = fieldText(form, "track")
    void action.run(
      saveArmAction,
      {
        school,
        ...(arm === null ? {} : { id: arm.id, version: arm.version }),
        classId: entry.id,
        name: fieldText(form, "name"),
        curriculum: fieldText(form, "curriculum"),
        track: senior && track !== "" ? track : null,
      },
      () => {
        onDone()
        return arm === null ? "Arm added." : "Arm saved."
      }
    )
  }
  return (
    <SafeForm
      onSubmit={save}
      className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4"
      aria-label={
        arm === null
          ? `New arm for ${entry.name}`
          : `Edit ${entry.name} ${arm.name}`
      }
    >
      <Field
        id={`arm-${id}-name`}
        name="name"
        label="Arm name"
        defaultValue={arm?.name ?? ""}
        placeholder="B, or Gold"
        required
        maxLength={40}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`arm-${id}-curriculum`}
          name="curriculum"
          label="Curriculum"
          defaultValue={
            arm?.curriculum ?? entry.arms[0]?.curriculum ?? "nerdc_2025"
          }
        >
          {schoolSetup.CURRICULUM_VERSIONS.map((version) => (
            <option key={version} value={version}>
              {schoolSetup.CURRICULUM_LABELS[version]}
            </option>
          ))}
        </SelectField>
        {senior && (
          <SelectField
            id={`arm-${id}-track`}
            name="track"
            label="Field of study"
            defaultValue={arm?.track ?? ""}
          >
            <option value="">None</option>
            {schoolSetup.TRACKS.map((track) => (
              <option key={track} value={track}>
                {schoolSetup.TRACK_LABELS[track]}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={BUTTON} disabled={action.busy}>
          {arm === null ? "Add arm" : "Save arm"}
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

export function ClassesEditor({
  school,
  classes,
  hasSchoolTypes,
  profileHref,
}: {
  school: string
  classes: SchoolClass[]
  hasSchoolTypes: boolean
  profileHref: string
}): JSX.Element {
  const action = useSetupAction()
  const [editing, setEditing] = useState<Editing>(null)
  const close = () => {
    setEditing(null)
  }
  const missingDefaults =
    classes.every((entry) => entry.standardClass === null) ||
    classes.length === 0

  const createDefaults = () => {
    void action.run(createDefaultClassesAction, { school }, (data) =>
      data.created === 0
        ? "You already have the usual classes."
        : `${String(data.created)} classes added, each with arm A.`
    )
  }

  const used = STAGES.filter((stage) =>
    classes.some((entry) => entry.stage === stage)
  )

  return (
    <div className="flex flex-col gap-6">
      <ActionStatus action={action} />

      {classes.length === 0 && (
        <section className={SECTION} aria-labelledby="start-classes">
          <h2 id="start-classes" className="text-lg font-semibold">
            Start with the usual classes
          </h2>
          {hasSchoolTypes ? (
            <>
              <p className="text-base text-muted-foreground">
                We&apos;ll add the standard classes for your school&apos;s type,
                each with one arm called A. You can rename, remove or add
                classes afterwards.
              </p>
              <div>
                <Button
                  type="button"
                  className={BUTTON}
                  disabled={action.busy}
                  onClick={createDefaults}
                >
                  Add the usual classes
                </Button>
              </div>
            </>
          ) : (
            <p className="text-base">
              First, say what the school teaches in the{" "}
              <a href={profileHref} className="underline underline-offset-4">
                school profile
              </a>
              .
            </p>
          )}
        </section>
      )}

      {used.map((stage) => (
        <section
          key={stage}
          className={SECTION}
          aria-labelledby={`level-${stage}`}
        >
          <h2 id={`level-${stage}`} className="text-lg font-semibold">
            {schoolSetup.STAGE_LABELS[stage]}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {classes
              .filter((entry) => entry.stage === stage)
              .map((entry, index, list) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 py-4"
                  data-testid="class"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold">{entry.name}</h3>
                      {entry.standardClass !== null &&
                        standardLabel(entry.standardClass) !== entry.name && (
                          <span className="text-base text-muted-foreground">
                            Standard class: {standardLabel(entry.standardClass)}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={BUTTON}
                        onClick={() => {
                          setEditing({ kind: "class", id: entry.id, stage })
                        }}
                      >
                        Edit<span className="sr-only"> {entry.name}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={BUTTON}
                        disabled={index === 0 || action.busy}
                        onClick={() => {
                          void action.run(
                            moveClassAction,
                            { school, id: entry.id, direction: "up" },
                            () => `${entry.name} moved up.`
                          )
                        }}
                      >
                        Up
                        <span className="sr-only">: move {entry.name} up</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={BUTTON}
                        disabled={index === list.length - 1 || action.busy}
                        onClick={() => {
                          void action.run(
                            moveClassAction,
                            { school, id: entry.id, direction: "down" },
                            () => `${entry.name} moved down.`
                          )
                        }}
                      >
                        Down
                        <span className="sr-only">
                          : move {entry.name} down
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className={BUTTON}
                        onClick={() => {
                          setEditing({ kind: "remove-class", id: entry.id })
                        }}
                      >
                        Remove<span className="sr-only"> {entry.name}</span>
                      </Button>
                    </div>
                  </div>

                  {editing?.kind === "class" && editing.id === entry.id && (
                    <ClassForm
                      school={school}
                      action={action}
                      entry={entry}
                      stage={stage}
                      onDone={close}
                    />
                  )}
                  {editing?.kind === "remove-class" &&
                    editing.id === entry.id && (
                      <div
                        role="group"
                        aria-label={`Remove ${entry.name}`}
                        className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4"
                      >
                        <p className="text-base">
                          Remove {entry.name} and its arms? Nothing uses them
                          yet. They&apos;re kept in the records, out of sight.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className={BUTTON}
                            disabled={action.busy}
                            onClick={() => {
                              void action.run(
                                removeClassAction,
                                { school, id: entry.id },
                                () => {
                                  close()
                                  return `${entry.name} removed.`
                                }
                              )
                            }}
                          >
                            Yes, remove {entry.name}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className={BUTTON}
                            onClick={close}
                          >
                            Keep it
                          </Button>
                        </div>
                      </div>
                    )}

                  <ul
                    className="flex flex-col gap-2"
                    aria-label={`Arms of ${entry.name}`}
                  >
                    {entry.arms.map((arm) => (
                      <li key={arm.id} className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                          <span className="text-base">
                            <span className="font-semibold">
                              {entry.name} {arm.name}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              · {armSummary(arm)}
                            </span>
                          </span>
                          <span className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className={BUTTON}
                              onClick={() => {
                                setEditing({
                                  kind: "arm",
                                  classId: entry.id,
                                  id: arm.id,
                                })
                              }}
                            >
                              Edit
                              <span className="sr-only">
                                {" "}
                                {entry.name} {arm.name}
                              </span>
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className={BUTTON}
                              onClick={() => {
                                setEditing({ kind: "remove-arm", id: arm.id })
                              }}
                            >
                              Remove
                              <span className="sr-only">
                                {" "}
                                {entry.name} {arm.name}
                              </span>
                            </Button>
                          </span>
                        </div>
                        {editing?.kind === "arm" && editing.id === arm.id && (
                          <ArmForm
                            school={school}
                            action={action}
                            entry={entry}
                            arm={arm}
                            onDone={close}
                          />
                        )}
                        {editing?.kind === "remove-arm" &&
                          editing.id === arm.id && (
                            <div
                              role="group"
                              aria-label={`Remove ${entry.name} ${arm.name}`}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 p-3"
                            >
                              <span className="text-base">
                                Remove {entry.name} {arm.name}?
                              </span>
                              <Button
                                type="button"
                                variant="destructive"
                                className={BUTTON}
                                disabled={action.busy}
                                onClick={() => {
                                  void action.run(
                                    removeArmAction,
                                    { school, id: arm.id },
                                    () => {
                                      close()
                                      return `${entry.name} ${arm.name} removed.`
                                    }
                                  )
                                }}
                              >
                                Yes, remove
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className={BUTTON}
                                onClick={close}
                              >
                                Keep it
                              </Button>
                            </div>
                          )}
                      </li>
                    ))}
                  </ul>
                  {editing?.kind === "arm" &&
                  editing.id === null &&
                  editing.classId === entry.id ? (
                    <ArmForm
                      school={school}
                      action={action}
                      entry={entry}
                      arm={null}
                      onDone={close}
                    />
                  ) : (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className={BUTTON}
                        onClick={() => {
                          setEditing({
                            kind: "arm",
                            classId: entry.id,
                            id: null,
                          })
                        }}
                      >
                        Add an arm
                        <span className="sr-only"> to {entry.name}</span>
                      </Button>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}

      {classes.length > 0 && (
        <section className={SECTION} aria-labelledby="add-class">
          <h2 id="add-class" className="text-lg font-semibold">
            Add a class
          </h2>
          {editing?.kind === "class" && editing.id === null ? (
            <ClassForm
              school={school}
              action={action}
              entry={null}
              stage={editing.stage}
              onDone={close}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={BUTTON}
                onClick={() => {
                  setEditing({
                    kind: "class",
                    id: null,
                    stage: used[0] ?? "primary",
                  })
                }}
              >
                Add a class
              </Button>
              {hasSchoolTypes && missingDefaults && (
                <Button
                  type="button"
                  variant="outline"
                  className={BUTTON}
                  disabled={action.busy}
                  onClick={createDefaults}
                >
                  Add the usual classes
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
