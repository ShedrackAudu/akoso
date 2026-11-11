import { describe, expect, it } from "vitest"

import type { Database } from "./client"
import { InvalidTenantIdError, withTenant } from "./with-tenant"

// A database that fails the test if anything reaches it.
const untouchable = {
  transaction: () => {
    throw new Error("withTenant() reached the database with a bad tenant ID")
  },
} as unknown as Database

describe("db/withTenant without a database", () => {
  it.each([
    ["an empty string", ""],
    ["a school slug", "greenfield"],
    ["SQL", "x'); select 1; --"],
    ["a UUID with extra text", "4f2c3d1e-0b6a-4c8e-9f1a-2b3c4d5e6f70 or 1=1"],
  ])("rejects %s before any query runs", async (_label, tenantId) => {
    await expect(
      withTenant(untouchable, tenantId, () => Promise.resolve(1))
    ).rejects.toBeInstanceOf(InvalidTenantIdError)
  })

  it("never puts the rejected value in the error message", async () => {
    await expect(
      withTenant(untouchable, "secret-looking-value", () => Promise.resolve(1))
    ).rejects.not.toThrow(/secret-looking-value/)
  })
})
