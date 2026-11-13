// For environments with no email provider yet: every send fails loudly, so nothing is
// silently lost. Callers that only send notices catch and log the failure.
import type { EmailProvider } from "./port"

export const unconfiguredEmailProvider: EmailProvider = {
  send() {
    return Promise.reject(
      new Error("No email provider is configured for this environment")
    )
  },
}
