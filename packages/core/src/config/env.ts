import { z } from "zod"

/**
 * Every environment variable the server and worker read.
 * Add a variable here, and to `.env.example`, in the same pull request that starts reading it.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_BASE_DOMAIN: z
    .string()
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
      "must be a bare hostname such as akoso.ng, with no scheme, port or path"
    ),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\/.+/, "must be a postgres:// connection string"),
})

export type Env = z.infer<typeof envSchema>

/** Thrown at startup when the environment is incomplete. Names the variables, never their values. */
export class EnvValidationError extends Error {
  readonly problems: readonly string[]

  constructor(problems: readonly string[]) {
    super(`Invalid environment: ${problems.join("; ")}`)
    this.name = "EnvValidationError"
    this.problems = problems
  }
}

/**
 * Validates environment variables and returns them typed. Call once at startup and fail fast.
 *
 * @param source Usually `process.env`; passed in so this stays testable and free of globals.
 * @throws EnvValidationError listing each missing or malformed variable by name. Values are
 *   never included, because some of them are secrets.
 */
export function loadEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source)
  if (parsed.success) {
    return parsed.data
  }
  const problems = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  )
  throw new EnvValidationError(problems)
}
