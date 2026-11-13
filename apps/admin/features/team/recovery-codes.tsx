import type { JSX } from "react"

/** Recovery codes, shown once, with what to do with them. */
export function RecoveryCodes({ codes }: { codes: string[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base">
        Keep these recovery codes somewhere safe, away from your devices, such
        as on paper in a locked drawer. Each works once, if you lose every
        passkey. They won&apos;t be shown again.
      </p>
      <ul
        data-testid="recovery-codes"
        className="grid grid-cols-2 gap-2 rounded-lg border border-border p-4 font-mono text-base"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
    </div>
  )
}
