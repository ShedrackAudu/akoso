"use client"

// Setup step 3, the school calendar (school setup part A spec, section 4): public
// holidays, closures and other days off. Suggested fixed holidays are added only when
// the school ticks and confirms them; holidays that move are added when declared.
import type { JSX, SyntheticEvent } from "react"

import type { AcademicSession, NonSchoolDay } from "@akoso/core/school-setup"
import { time } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import {
  addNonSchoolDayAction,
  confirmHolidaysAction,
  removeNonSchoolDayAction,
} from "@/server/actions/school-setup"

import {
  ActionStatus,
  BUTTON,
  CHECK,
  SECTION,
  SelectField,
  useSetupAction,
} from "./controls"

const REASON_LABELS: Record<NonSchoolDay["reason"], string> = {
  public_holiday: "Public holiday",
  closure: "School closed",
  other: "Other day off",
}

const show = (date: string): string => time.formatDate(date as time.LocalDate)

function Days({ day }: { day: NonSchoolDay }): JSX.Element {
  return (
    <>
      {show(day.startsOn)}
      {day.endsOn !== day.startsOn && <> to {show(day.endsOn)}</>}
    </>
  )
}

export function CalendarEditor({
  school,
  current,
  nonSchoolDays,
  suggested,
}: {
  school: string
  current: AcademicSession | null
  nonSchoolDays: NonSchoolDay[]
  suggested: { date: string; name: string }[]
}): JSX.Element {
  const confirm = useSetupAction()
  const add = useSetupAction()
  const remove = useSetupAction()

  const confirmChosen = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const chosen = new FormData(event.currentTarget)
      .getAll("holiday")
      .map(String)
    const holidays = suggested.filter((holiday) =>
      chosen.includes(holiday.date)
    )
    void confirm.run(confirmHolidaysAction, { school, holidays }, (data) => {
      return data.added === 1
        ? "1 holiday added."
        : `${String(data.added)} holidays added.`
    })
  }

  const addDay = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    const startsOn = fieldText(form, "startsOn")
    const endsOn = fieldText(form, "endsOn")
    void add.run(
      addNonSchoolDayAction,
      {
        school,
        startsOn,
        endsOn: endsOn === "" ? startsOn : endsOn,
        reason: fieldText(form, "reason"),
        note: fieldText(form, "note"),
      },
      () => {
        target.reset()
        return "Day off added."
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {current !== null && (
        <section className={SECTION} aria-labelledby="terms-days">
          <h2 id="terms-days" className="text-lg font-semibold">
            School days in {current.name}
          </h2>
          {current.terms.length === 0 ? (
            <p className="text-base text-muted-foreground">
              Add the term dates first. School days are counted from them.
            </p>
          ) : (
            <ul
              className="flex flex-col gap-1 text-base"
              data-testid="school-days"
            >
              {current.terms.map((term) => (
                <li key={term.id}>
                  Term {term.number}: {term.schoolDays} school days
                </li>
              ))}
            </ul>
          )}
          <p className="text-base text-muted-foreground">
            Weekdays in each term, less the mid-term break and the days off
            below.
          </p>
        </section>
      )}

      {suggested.length > 0 && (
        <SafeForm
          onSubmit={confirmChosen}
          className={SECTION}
          aria-labelledby="suggested"
        >
          <h2 id="suggested" className="text-lg font-semibold">
            Suggested public holidays
          </h2>
          <p className="text-base text-muted-foreground">
            These fall on fixed dates. Tick the ones your school closes for.
            Holidays that move, like Easter and the Eids, are announced later:
            add them below when they are declared.
          </p>
          <fieldset className="flex flex-col">
            <legend className="sr-only">Holidays to add</legend>
            {suggested.map((holiday) => (
              <label key={holiday.date} className={CHECK}>
                <input
                  type="checkbox"
                  name="holiday"
                  value={holiday.date}
                  defaultChecked
                  className="size-5"
                />
                {holiday.name}, {show(holiday.date)}
              </label>
            ))}
          </fieldset>
          <ActionStatus action={confirm} />
          <div>
            <Button type="submit" className={BUTTON} disabled={confirm.busy}>
              Add ticked holidays
            </Button>
          </div>
        </SafeForm>
      )}

      <SafeForm onSubmit={addDay} className={SECTION} aria-labelledby="add-day">
        <h2 id="add-day" className="text-lg font-semibold">
          Add a day off
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="day-starts"
            name="startsOn"
            label="First day"
            type="date"
            required
          />
          <Field
            id="day-ends"
            name="endsOn"
            label="Last day (if more than one)"
            type="date"
          />
        </div>
        <SelectField
          id="day-reason"
          name="reason"
          label="Reason"
          defaultValue="public_holiday"
        >
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          id="day-note"
          name="note"
          label="Note (optional)"
          maxLength={200}
          placeholder="Eid el-Fitr"
        />
        <ActionStatus action={add} />
        <div>
          <Button type="submit" className={BUTTON} disabled={add.busy}>
            Add day off
          </Button>
        </div>
      </SafeForm>

      <section className={SECTION} aria-labelledby="days-off">
        <h2 id="days-off" className="text-lg font-semibold">
          Days off
        </h2>
        <ActionStatus action={remove} />
        {nonSchoolDays.length === 0 ? (
          <p className="text-base text-muted-foreground">No days off yet.</p>
        ) : (
          <ul
            className="flex flex-col divide-y divide-border"
            data-testid="days-off"
          >
            {nonSchoolDays.map((day) => (
              <li
                key={day.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-col">
                  <span className="text-base font-semibold">
                    <Days day={day} />
                  </span>
                  <span className="text-base text-muted-foreground">
                    {REASON_LABELS[day.reason]}
                    {day.note !== "" && <> · {day.note}</>}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  className={BUTTON}
                  disabled={remove.busy}
                  onClick={() => {
                    void remove.run(
                      removeNonSchoolDayAction,
                      { school, id: day.id },
                      () => "Day off removed."
                    )
                  }}
                >
                  Remove
                  <span className="sr-only">
                    {" "}
                    {day.note === ""
                      ? REASON_LABELS[day.reason]
                      : day.note}, {show(day.startsOn)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
