"use client"

// Spike 02. A tap-to-mark register: one row of four choices per student.
import type { JSX } from "react"

import type { StoredSheet } from "./local-store"

const REGISTER_CHOICES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
] as const

function attendanceKey(studentId: string, date: string): string {
  return `attendance:${studentId}:${date}`
}

interface RegisterProps {
  sheet: StoredSheet
  valueOf: (cellKey: string) => { value: string; unsent: boolean }
  onChange: (cellKey: string, value: string) => void
}

export function Register({
  sheet,
  valueOf,
  onChange,
}: RegisterProps): JSX.Element {
  return (
    <ul className="divide-y">
      {sheet.students.map((student) => {
        const key = attendanceKey(student.id, sheet.schoolToday)
        const { value, unsent } = valueOf(key)
        return (
          <li key={student.id} className="py-2">
            <fieldset data-testid={key} data-unsent={unsent ? "yes" : "no"}>
              <legend className="text-base">
                {student.name}
                {unsent ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Not sent yet
                  </span>
                ) : null}
              </legend>
              <div className="mt-1 grid grid-cols-4 gap-1">
                {REGISTER_CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={key}
                      value={choice.value}
                      checked={value === choice.value}
                      onChange={() => {
                        onChange(key, choice.value)
                      }}
                    />
                    {choice.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        )
      })}
    </ul>
  )
}
