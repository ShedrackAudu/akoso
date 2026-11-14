"use client"

// Spike 02. The always-visible connection and unsent-changes indicator (section 20).
import type { JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import { useConnection } from "./use-live"

interface StatusBarProps {
  waiting: number
  needsSignIn: boolean
  onSignInAgain: () => void
}

function describe(online: boolean, syncing: boolean, waiting: number): string {
  const changes = `${String(waiting)} ${waiting === 1 ? "change" : "changes"}`
  if (syncing && waiting > 0) {
    return `Sending ${changes} to the school.`
  }
  if (!online) {
    return waiting === 0
      ? "You are offline. Everything you enter is saved on this phone."
      : `You are offline. ${changes} saved on this phone will be sent when you reconnect.`
  }
  return waiting === 0
    ? "Online. Every change has reached the school."
    : `Online. ${changes} waiting to be sent.`
}

export function StatusBar({
  waiting,
  needsSignIn,
  onSignInAgain,
}: StatusBarProps): JSX.Element {
  const { online, syncing } = useConnection()
  return (
    <div
      className="sticky top-0 z-10 border-b bg-background px-4 py-3"
      data-testid="status-bar"
      data-online={online ? "yes" : "no"}
      data-waiting={waiting}
    >
      {needsSignIn ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm">
            Your sign-in has expired. {waiting}{" "}
            {waiting === 1 ? "change is" : "changes are"} kept on this phone and
            will be sent after you sign in.
          </p>
          <Button size="lg" className="min-h-8" onClick={onSignInAgain}>
            Sign in again
          </Button>
        </div>
      ) : (
        <p role="status" className="text-sm">
          <span
            aria-hidden="true"
            className={`mr-2 inline-block size-2.5 rounded-full ${online ? "bg-primary" : "bg-muted-foreground"}`}
          />
          {describe(online, syncing, waiting)}
        </p>
      )}
    </div>
  )
}
