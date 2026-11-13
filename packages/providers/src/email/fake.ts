// The fake email provider for local development and tests, like the fake SMS provider:
// an in-memory outbox, optionally printed to the console (development) or written to a
// file, newest message per address (end-to-end tests read it). Only for local
// `.localhost` addresses, so a real deployment can never silently swallow email.
import { writeFileSync } from "node:fs"

import type { EmailMessage, EmailProvider } from "./port"

export interface FakeEmailProvider extends EmailProvider {
  /** Every message "sent", oldest first. */
  readonly outbox: readonly EmailMessage[]
  /** The newest message to an address, if any. */
  lastTo(address: string): EmailMessage | undefined
  clear(): void
}

export interface FakeEmailOptions {
  /** APP_BASE_DOMAIN. Must end in `.localhost`. */
  baseDomain: string
  printToConsole?: boolean
  /** A file to keep the newest message per address in, as JSON. */
  outboxFile?: string
}

export function createFakeEmailProvider(
  options: FakeEmailOptions
): FakeEmailProvider {
  if (!options.baseDomain.endsWith(".localhost")) {
    throw new Error(
      "The fake email provider is only for local .localhost addresses"
    )
  }
  const outbox: EmailMessage[] = []
  const latest: Record<string, string> = {}
  return {
    outbox,
    send(message) {
      outbox.push(message)
      if (options.printToConsole === true) {
        // Local only: what a real email would carry.
        console.info(
          `[fake email to ${message.to}] ${message.subject}\n${message.text}`
        )
      }
      if (options.outboxFile !== undefined) {
        latest[message.to] = message.text
        writeFileSync(options.outboxFile, JSON.stringify(latest), "utf8")
      }
      return Promise.resolve()
    },
    lastTo(address) {
      return outbox.filter((message) => message.to === address).at(-1)
    },
    clear() {
      outbox.length = 0
    },
  }
}
