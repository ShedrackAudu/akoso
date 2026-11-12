// The fake SMS provider for local development and tests. Messages go to an in-memory
// outbox. Optionally it also prints sign-in codes to the server console (development)
// or writes the newest message per number to a file (end-to-end tests read it). It may
// only be created for a local `.localhost` address, so a real deployment can never
// silently swallow codes.
import { writeFileSync } from "node:fs"

import type { SmsMessage, SmsProvider } from "./port"

export interface FakeSmsProvider extends SmsProvider {
  /** Every message "sent", oldest first. */
  readonly outbox: readonly SmsMessage[]
  /** The newest message to a number, if any. */
  lastTo(phoneNumber: string): SmsMessage | undefined
  clear(): void
}

export interface FakeSmsOptions {
  /** APP_BASE_DOMAIN. Must end in `.localhost`. */
  baseDomain: string
  printToConsole?: boolean
  /** A file to keep the newest message per number in, as JSON. */
  outboxFile?: string
}

export function createFakeSmsProvider(
  options: FakeSmsOptions
): FakeSmsProvider {
  if (!options.baseDomain.endsWith(".localhost")) {
    throw new Error(
      "The fake SMS provider is only for local .localhost addresses"
    )
  }
  const outbox: SmsMessage[] = []
  const latest: Record<string, string> = {}
  return {
    outbox,
    send(message) {
      outbox.push(message)
      if (options.printToConsole === true) {
        // Local only: what a real SMS would carry.
        console.info(`[fake SMS to ${message.to}] ${message.body}`)
      }
      if (options.outboxFile !== undefined) {
        latest[message.to] = message.body
        writeFileSync(options.outboxFile, JSON.stringify(latest), "utf8")
      }
      return Promise.resolve()
    },
    lastTo(phoneNumber) {
      return outbox.filter((message) => message.to === phoneNumber).at(-1)
    },
    clear() {
      outbox.length = 0
    },
  }
}
