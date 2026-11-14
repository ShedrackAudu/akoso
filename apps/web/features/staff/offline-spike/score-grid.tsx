"use client"

// Spike 02. A plain score grid: enough to enter 45 students' scores on a phone.
// Not the real design.
import { useState, type JSX } from "react"

import type { StoredSheet } from "./local-store"

interface ScoreGridProps {
  sheet: StoredSheet
  valueOf: (cellKey: string) => { value: string; unsent: boolean }
  onChange: (cellKey: string, value: string) => void
}

const WHOLE_NUMBER = /^\d{1,3}$/

function scoreKey(studentId: string, component: string): string {
  return `score:${studentId}:${component}`
}

function ScoreCell({
  cellKey,
  label,
  maximum,
  saved,
  unsent,
  disabled,
  onChange,
}: {
  cellKey: string
  label: string
  maximum: number
  saved: string
  unsent: boolean
  disabled: boolean
  onChange: (cellKey: string, value: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? saved
  const problem =
    draft === null || draft === ""
      ? null
      : !WHOLE_NUMBER.test(draft)
        ? "Whole numbers only."
        : Number(draft) > maximum
          ? `Above the maximum of ${String(maximum)}.`
          : null

  const commit = (): void => {
    if (draft === null || draft === saved || draft === "" || problem !== null) {
      return
    }
    onChange(cellKey, draft)
    setDraft(null)
  }

  return (
    <td className="p-1 align-top">
      <input
        className="h-7 w-14 rounded-md border bg-background px-2 text-center text-sm disabled:opacity-50 aria-invalid:border-destructive"
        inputMode="numeric"
        aria-label={label}
        aria-invalid={problem !== null}
        data-testid={cellKey}
        data-unsent={unsent ? "yes" : "no"}
        value={shown}
        disabled={disabled}
        onChange={(e) => {
          setDraft(e.target.value.trim())
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit()
          }
        }}
      />
      {unsent && draft === null ? (
        <span className="block text-xs text-muted-foreground">
          Not sent yet
        </span>
      ) : null}
      {problem === null ? null : (
        <span role="alert" className="block text-xs text-destructive">
          {problem}
        </span>
      )}
    </td>
  )
}

export function ScoreGrid({
  sheet,
  valueOf,
  onChange,
}: ScoreGridProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left">
              Student
            </th>
            {sheet.components.map((c) => (
              <th key={c.key} scope="col" className="p-2 text-left">
                {c.label}{" "}
                <span className="text-muted-foreground">/{c.maximum}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.students.map((student) => (
            <tr key={student.id} className="border-t">
              <th scope="row" className="p-2 text-left font-normal">
                {student.name}
              </th>
              {sheet.components.map((c) => {
                const key = scoreKey(student.id, c.key)
                const { value, unsent } = valueOf(key)
                return (
                  <ScoreCell
                    // Re-mount when the saved value changes, so a stale draft never hides it.
                    key={`${key}:${value}`}
                    cellKey={key}
                    label={`${student.name}, ${c.label}, out of ${String(c.maximum)}`}
                    maximum={c.maximum}
                    saved={value}
                    unsent={unsent}
                    disabled={sheet.locked}
                    onChange={onChange}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
