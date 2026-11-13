// The one Better Auth instance per process, and the senders and key the identity use
// cases share, built from the environment.
import { email, sms } from "@akoso/providers"

import { loadEnv } from "../config/index"
import { getDatabase } from "../kernel/index"
import { createAuth, type AkosoAuth } from "./auth"

let instance: AkosoAuth | undefined
let services: IdentityServices | undefined

/** What the identity use cases send messages with, and hash codes with. */
export interface IdentityServices {
  sms: sms.SmsProvider
  email: email.EmailProvider
  /** BETTER_AUTH_SECRET: the key for one-time codes and link tokens. */
  hashKey: string
  /** APP_BASE_DOMAIN, for links in messages. */
  baseDomain: string
}

/** SMS for codes: the fake locally, nothing yet on a real domain (no Termii). */
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

/** Email: the fake locally, nothing yet on a real domain (no Resend or SES). */
function emailFor(env: ReturnType<typeof loadEnv>): email.EmailProvider {
  if (!env.APP_BASE_DOMAIN.endsWith(".localhost")) {
    return email.unconfiguredEmailProvider
  }
  return email.createFakeEmailProvider({
    baseDomain: env.APP_BASE_DOMAIN,
    printToConsole: env.NODE_ENV === "development",
    outboxFile: process.env.EMAIL_FAKE_OUTBOX_FILE,
  })
}

export function getIdentityServices(): IdentityServices {
  if (services === undefined) {
    const env = loadEnv(process.env)
    services = {
      sms: smsFor(env),
      email: emailFor(env),
      hashKey: env.BETTER_AUTH_SECRET,
      baseDomain: env.APP_BASE_DOMAIN,
    }
  }
  return services
}

/** For tests: use these senders instead of the environment's. */
export function setIdentityServices(next: IdentityServices): void {
  services = next
}

export function getAuth(): AkosoAuth {
  if (instance === undefined) {
    const env = loadEnv(process.env)
    const shared = getIdentityServices()
    instance = createAuth({
      db: getDatabase(),
      secret: env.BETTER_AUTH_SECRET,
      baseDomain: env.APP_BASE_DOMAIN,
      sms: shared.sms,
    })
  }
  return instance
}
