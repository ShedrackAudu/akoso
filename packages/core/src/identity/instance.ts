// The one Better Auth instance per process, built from the environment.
import { sms } from "@akoso/providers"

import { loadEnv } from "../config/index"
import { getDatabase } from "../kernel/index"
import { createAuth, type AkosoAuth } from "./auth"

let instance: AkosoAuth | undefined

/** SMS for sign-in codes: the fake locally, nothing yet on a real domain (no Termii). */
function smsFor(env: ReturnType<typeof loadEnv>): sms.SmsProvider {
  if (!env.APP_BASE_DOMAIN.endsWith(".localhost")) {
    return sms.unconfiguredSmsProvider
  }
  return sms.createFakeSmsProvider({
    baseDomain: env.APP_BASE_DOMAIN,
    printToConsole: env.NODE_ENV === "development",
    outboxFile: process.env.SMS_FAKE_OUTBOX_FILE,
  })
}

export function getAuth(): AkosoAuth {
  if (instance === undefined) {
    const env = loadEnv(process.env)
    instance = createAuth({
      db: getDatabase(),
      secret: env.BETTER_AUTH_SECRET,
      baseDomain: env.APP_BASE_DOMAIN,
      sms: smsFor(env),
    })
  }
  return instance
}
