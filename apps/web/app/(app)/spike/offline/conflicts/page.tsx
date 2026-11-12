import type { Metadata } from "next"
import type { JSX } from "react"

import { listSpikeConflicts } from "@akoso/core/offline-sync"

// Spike 02: the head teacher's list of scores a later edit overwrote (brief section 20).
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Overwritten scores (spike)",
  robots: { index: false, follow: false },
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default async function Page(): Promise<JSX.Element> {
  const conflicts = await listSpikeConflicts()
  return (
    <main className="space-y-4 p-4">
      <h1 className="font-heading text-2xl font-bold">Overwritten scores</h1>
      <p className="text-base text-muted-foreground">
        When two people changed the same score, the change that reached the
        school later was kept. The value it replaced is listed here so nothing
        is lost.
      </p>
      {conflicts.length === 0 ? (
        <p className="text-base" data-testid="no-conflicts">
          No scores have been overwritten.
        </p>
      ) : (
        <table className="w-full text-base" data-testid="conflicts">
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left">
                Cell
              </th>
              <th scope="col" className="p-2 text-left">
                Replaced value
              </th>
              <th scope="col" className="p-2 text-left">
                Kept value
              </th>
              <th scope="col" className="p-2 text-left">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c) => (
              <tr key={`${c.cellKey}:${c.receivedAt}`} className="border-t">
                <td className="p-2 font-mono text-sm">{c.cellKey}</td>
                <td className="p-2">{c.overwrittenValue}</td>
                <td className="p-2">{c.winningValue}</td>
                <td className="p-2">{formatWhen(c.receivedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
