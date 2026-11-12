import { describe, expect, it } from "vitest"

import { EnvValidationError, loadEnv } from "./env"

const valid = {
  NODE_ENV: "development",
  APP_BASE_DOMAIN: "akoso.localhost",
  DATABASE_URL: "postgres://user:not-a-real-password@localhost:5432/akoso_dev",
  BETTER_AUTH_SECRET: "test-only-not-a-real-secret-00000000000",
}

describe("core/config loadEnv", () => {
  it("returns typed values when every variable is present and well formed", () => {
    expect(loadEnv(valid)).toEqual(valid)
  })

  it("ignores variables it does not know about", () => {
    expect(loadEnv({ ...valid, SOMETHING_ELSE: "x" })).toEqual(valid)
  })

  it("fails fast and names a missing variable", () => {
    const withoutDatabase = {
      NODE_ENV: valid.NODE_ENV,
      APP_BASE_DOMAIN: valid.APP_BASE_DOMAIN,
    }
    expect(() => loadEnv(withoutDatabase)).toThrow(EnvValidationError)
    expect(() => loadEnv(withoutDatabase)).toThrow(/DATABASE_URL/)
  })

  it("rejects a base domain that carries a scheme or path", () => {
    expect(() =>
      loadEnv({ ...valid, APP_BASE_DOMAIN: "https://akoso.ng/" })
    ).toThrow(/APP_BASE_DOMAIN/)
  })

  it("never puts a variable's value in the error message", () => {
    const bad = { ...valid, DATABASE_URL: "mysql://user:hunter2@host/db" }
    try {
      loadEnv(bad)
      expect.unreachable("loadEnv should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      expect((error as Error).message).not.toContain("hunter2")
    }
  })
})
