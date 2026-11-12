// The typed /api/v1 client (brief section 5.1), for the Expo app and any other client.
// Built straight from the contracts in @akoso/schemas, so it always matches the server:
//
//   const api = createApiClient(CONTRACTS, { baseUrl, getToken, getSchoolId })
//   const { status } = await api.getHealth({})
//
// Works wherever fetch does (React Native included). No code generation step.
import type { z } from "zod"

import {
  IDEMPOTENCY_KEY_HEADER,
  isWrite,
  problemDetailsSchema,
  SCHOOL_HEADER,
  type Contract,
  type ProblemDetails,
} from "@akoso/schemas/api"

/** An error answer from the API, in Problem Details form. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails
  ) {
    super(problem.title)
    this.name = "ApiError"
  }
}

export interface ApiClientOptions {
  /** e.g. https://app.akoso.ng */
  baseUrl: string
  /** The signed-in user's bearer token, or null. */
  getToken?: () => string | null | Promise<string | null>
  /** The school chosen in the app's school picker, or null. */
  getSchoolId?: () => string | null
  /** Defaults to the global fetch. */
  fetch?: typeof fetch
  /** Defaults to crypto.randomUUID(). */
  makeIdempotencyKey?: () => string
  /** Retries after a network failure, reusing the same idempotency key. Default 2. */
  retries?: number
}

export type ApiClient<Contracts extends Record<string, Contract>> = {
  [Name in keyof Contracts]: (
    input: z.input<Contracts[Name]["input"]>
  ) => Promise<z.output<Contracts[Name]["output"]>>
}

const queryValue = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value)

/** Builds one typed method per contract. */
export function createApiClient<Contracts extends Record<string, Contract>>(
  contracts: Contracts,
  options: ApiClientOptions
): ApiClient<Contracts> {
  const fetchFn = options.fetch ?? fetch
  const makeKey =
    options.makeIdempotencyKey ?? (() => globalThis.crypto.randomUUID())
  const retries = options.retries ?? 2

  const call = async (contract: Contract, rawInput: unknown) => {
    // Checked here too, so a mistake shows before anything is sent.
    const input = contract.input.parse(rawInput)
    const pathNames = new Set<string>()
    const path = contract.path.replace(
      /\{([A-Za-z0-9_]+)\}/g,
      (_, name: string) => {
        pathNames.add(name)
        return encodeURIComponent(queryValue(input[name]))
      }
    )
    const rest = Object.fromEntries(
      Object.entries(input).filter(([name]) => !pathNames.has(name))
    )
    const url = new URL(path, options.baseUrl)
    const headers: Record<string, string> = { Accept: "application/json" }
    let body: string | undefined
    if (contract.method === "GET") {
      for (const [name, value] of Object.entries(rest)) {
        if (value !== undefined) url.searchParams.set(name, queryValue(value))
      }
    } else {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(rest)
    }
    if (isWrite(contract.method)) headers[IDEMPOTENCY_KEY_HEADER] = makeKey()
    const token = await options.getToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
    const schoolId = options.getSchoolId?.()
    if (schoolId) headers[SCHOOL_HEADER] = schoolId

    let response: Response | undefined
    for (let attempt = 0; response === undefined; attempt++) {
      try {
        response = await fetchFn(url, {
          method: contract.method,
          headers,
          body,
        })
      } catch (error) {
        if (attempt >= retries) throw error
      }
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const problem = problemDetailsSchema.safeParse(payload)
      throw new ApiError(
        response.status,
        problem.success
          ? problem.data
          : {
              type: "about:blank",
              title: "Something went wrong. Please try again in a moment.",
              status: response.status,
              code: "internal",
              requestId: response.headers.get("X-Request-Id") ?? "",
            }
      )
    }
    return contract.output.parse(payload)
  }

  return Object.fromEntries(
    Object.entries(contracts).map(([name, contract]) => [
      name,
      (input: unknown) => call(contract, input),
    ])
  ) as ApiClient<Contracts>
}
