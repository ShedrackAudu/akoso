// The one team Better Auth instance per process, built from the environment.
import { loadEnv } from "../config/index"
import { getDatabase } from "../kernel/index"
import { createTeamAuth, type TeamAuth } from "./auth"

let instance: TeamAuth | undefined

export function getTeamAuth(): TeamAuth {
  if (instance === undefined) {
    const env = loadEnv(process.env)
    instance = createTeamAuth({
      db: getDatabase(),
      secret: env.BETTER_AUTH_SECRET,
      baseDomain: env.APP_BASE_DOMAIN,
    })
  }
  return instance
}

/** BETTER_AUTH_SECRET and the base domain, for recovery codes and links. */
export function teamSettings(): { hashKey: string; baseDomain: string } {
  const env = loadEnv(process.env)
  return { hashKey: env.BETTER_AUTH_SECRET, baseDomain: env.APP_BASE_DOMAIN }
}
