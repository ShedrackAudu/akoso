"use client"

// A form that can't be sent before the page is ready. Until React has attached its
// handlers, a plain <form> would submit the browser's way: a GET that puts every field,
// passwords and codes included, in the address bar, the browser history and server
// logs. On slow phones that window is long. So:
//
// - it submits with POST, so even an early submission never puts fields in the address;
// - its controls are disabled until the page is interactive, so nobody (and no test)
//   can send it too early.
//
// Use it for every form whose submission is handled in JavaScript.
import { useSyncExternalStore, type ComponentProps, type JSX } from "react"

const subscribe = (): (() => void) => () => undefined

/** True once the page is interactive in the browser; false in server-rendered HTML. */
function useInteractive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export function SafeForm({
  children,
  ...props
}: Omit<ComponentProps<"form">, "method" | "action">): JSX.Element {
  const interactive = useInteractive()
  return (
    <form method="post" {...props}>
      <fieldset
        disabled={!interactive}
        className="contents"
        data-ready={interactive ? "true" : "false"}
      >
        {children}
      </fieldset>
    </form>
  )
}
