"use client"

// Spike 02. The offline score sheet and register screen. Not the real design.
import { useCallback, useEffect, useMemo, useState, type JSX } from "react"

import { Button } from "@akoso/ui/components/button"

import {
  getMeta,
  store,
  type QueuedChange,
  type StoredCell,
  type StoredSheet,
} from "./local-store"
import { Register } from "./register"
import { ScoreGrid } from "./score-grid"
import { StatusBar } from "./status-bar"
import {
  clearAndSignOut,
  discardRejected,
  recordChange,
  refreshSheet,
  signIn,
  syncNow,
  trySignOut,
} from "./sync-engine"
import { useLive } from "./use-live"

const RETRY_EVERY_MS = 10_000

interface Snapshot {
  sheet: StoredSheet | undefined
  cells: StoredCell[]
  queue: QueuedChange[]
  needsSignIn: boolean
  signedOut: boolean
}

const EMPTY: Snapshot = {
  sheet: undefined,
  cells: [],
  queue: [],
  needsSignIn: false,
  signedOut: false,
}

async function readSnapshot(): Promise<Snapshot> {
  return {
    sheet: await store.sheet.get("current"),
    cells: await store.cells.toArray(),
    queue: await store.queue.orderBy("seq").toArray(),
    needsSignIn: (await getMeta("needsSignIn")) === "true",
    signedOut: (await getMeta("signedOut")) === "true",
  }
}

export function OfflineSpike(): JSX.Element {
  const snapshot = useLive(readSnapshot, EMPTY)
  const [tab, setTab] = useState<"scores" | "register">("scores")
  const [storageNote, setStorageNote] = useState("")
  const [signOutPrompt, setSignOutPrompt] = useState<number | null>(null)

  useEffect(() => {
    // Ask the browser not to clear this data when the phone runs low on space.
    void navigator.storage
      .persist()
      .then((granted) => {
        setStorageNote(granted ? "Saved data is protected on this phone." : "")
      })
      .catch(() => undefined)
    void refreshSheet().then(() => syncNow())
    const retry = (): void => {
      void syncNow()
    }
    window.addEventListener("online", retry)
    const timer = window.setInterval(retry, RETRY_EVERY_MS)
    return () => {
      window.removeEventListener("online", retry)
      window.clearInterval(timer)
    }
  }, [])

  const valueOf = useMemo(() => {
    const saved = new Map(snapshot.cells.map((c) => [c.cellKey, c.value]))
    const unsent = new Map<string, string>()
    for (const change of snapshot.queue) {
      if (change.status === "pending") {
        unsent.set(change.cellKey, change.value)
      }
    }
    return (cellKey: string) => {
      const waiting = unsent.get(cellKey)
      return waiting === undefined
        ? { value: saved.get(cellKey) ?? "", unsent: false }
        : { value: waiting, unsent: true }
    }
  }, [snapshot.cells, snapshot.queue])

  const onChange = useCallback((cellKey: string, value: string) => {
    void recordChange(cellKey, value).then(() => syncNow())
  }, [])

  const signInAgain = async (): Promise<void> => {
    // Spike stand-in for the real sign-in: tell the server the session is valid again.
    await fetch("/api/spike/offline/switches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionExpired: false }),
    }).catch(() => undefined)
    await signIn()
  }

  if (snapshot.signedOut) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base">You are signed out.</p>
        <Button size="lg" className="min-h-11" onClick={() => void signIn()}>
          Sign in
        </Button>
      </main>
    )
  }

  const sheet = snapshot.sheet
  const pending = snapshot.queue.filter((c) => c.status === "pending")
  const rejected = snapshot.queue.filter((c) => c.status === "rejected")

  return (
    <main className="min-h-svh pb-12">
      <StatusBar
        waiting={pending.length}
        needsSignIn={snapshot.needsSignIn}
        onSignInAgain={() => void signInAgain()}
      />
      {sheet === undefined ? (
        <p className="p-4 text-base">
          Loading the class. The first time, this needs a connection; after that
          it works offline.
        </p>
      ) : (
        <div className="space-y-4 p-4">
          <header className="space-y-1">
            <h1 className="font-heading text-2xl font-bold">
              {sheet.className}
            </h1>
            <p className="text-base text-muted-foreground">
              {sheet.subjectName} · Register for{" "}
              {sheet.schoolToday.split("-").reverse().join("/")}
            </p>
            {storageNote === "" ? null : (
              <p className="text-sm text-muted-foreground">{storageNote}</p>
            )}
          </header>

          {sheet.locked ? (
            <p
              role="status"
              className="rounded-md border p-3 text-base"
              data-testid="locked-note"
            >
              This sheet has been approved and is locked. Scores cannot be
              changed.
            </p>
          ) : null}

          {rejected.length === 0 ? null : (
            <section
              aria-labelledby="refused"
              className="rounded-md border border-destructive p-3"
              data-testid="refused"
            >
              <h2 id="refused" className="text-base font-bold">
                {rejected.length}{" "}
                {rejected.length === 1 ? "change was" : "changes were"} not
                saved
              </h2>
              <ul className="mt-2 space-y-2">
                {rejected.map((change) => (
                  <li
                    key={change.opId}
                    className="flex flex-wrap items-center justify-between gap-2 text-base"
                  >
                    <span>
                      {change.message ??
                        "The school could not save this change."}
                    </span>
                    <Button
                      variant="outline"
                      size="lg"
                      className="min-h-11"
                      onClick={() => {
                        if (
                          change.seq !== undefined &&
                          window.confirm(
                            "Discard this change? It will not reach the school."
                          )
                        ) {
                          void discardRejected(change.seq)
                        }
                      }}
                    >
                      Discard
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div
            role="tablist"
            aria-label="What to enter"
            className="grid grid-cols-2 gap-2"
          >
            {(["scores", "register"] as const).map((name) => (
              <Button
                key={name}
                role="tab"
                aria-selected={tab === name}
                variant={tab === name ? "default" : "outline"}
                size="lg"
                className="min-h-11"
                onClick={() => {
                  setTab(name)
                }}
              >
                {name === "scores" ? "Scores" : "Register"}
              </Button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === "scores" ? (
              <ScoreGrid sheet={sheet} valueOf={valueOf} onChange={onChange} />
            ) : (
              <Register sheet={sheet} valueOf={valueOf} onChange={onChange} />
            )}
          </div>

          {signOutPrompt === null ? (
            <Button
              variant="outline"
              size="lg"
              className="min-h-11"
              onClick={() => {
                void trySignOut().then(({ unsent }) => {
                  setSignOutPrompt(unsent === 0 ? null : unsent)
                })
              }}
            >
              Sign out
            </Button>
          ) : (
            <section
              role="alertdialog"
              aria-labelledby="sign-out-warning"
              className="space-y-2 rounded-md border border-destructive p-3"
            >
              <p id="sign-out-warning" className="text-base">
                {signOutPrompt}{" "}
                {signOutPrompt === 1 ? "change has" : "changes have"} not
                reached the school yet. If you sign out now,{" "}
                {signOutPrompt === 1 ? "it" : "they"} will be lost.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="min-h-11"
                  onClick={() => {
                    setSignOutPrompt(null)
                  }}
                >
                  Stay signed in
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="min-h-11"
                  onClick={() => {
                    void clearAndSignOut().then(() => {
                      setSignOutPrompt(null)
                    })
                  }}
                >
                  Sign out and discard
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
