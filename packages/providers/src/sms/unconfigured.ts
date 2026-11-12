// Used on a real domain until the Termii account exists (founder task). Every send
// fails loudly, so codes are never silently dropped.
import type { SmsProvider } from "./port"

export const unconfiguredSmsProvider: SmsProvider = {
  send() {
    return Promise.reject(
      new Error("No SMS provider is configured for this environment")
    )
  },
}
