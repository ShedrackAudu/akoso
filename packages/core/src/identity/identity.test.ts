import { describe, expect, it } from "vitest"

import {
  MFA_REQUIRED_ROLES,
  permissionsFor,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
} from "@akoso/schemas/permissions"
import { KNOWN_ACTIONS } from "@akoso/schemas/contracts/index"

import { protectStoredCode } from "./codes"
import { isCommonPassword } from "./passwords"
import { isNigerianNumber, normalisePhone } from "./phone"

describe("normalisePhone", () => {
  it.each([
    ["0803 123 4567", "+2348031234567"],
    ["08031234567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["234-803-123-4567", "+2348031234567"],
    ["+44 7911 123456", "+447911123456"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected)
  })

  it.each(["", "12345", "not a number", "0803 123"])("rejects %s", (input) => {
    expect(normalisePhone(input)).toBeNull()
  })

  it("knows Nigerian numbers", () => {
    expect(isNigerianNumber("+2348031234567")).toBe(true)
    expect(isNigerianNumber("+447911123456")).toBe(false)
  })
})

describe("protectStoredCode", () => {
  const hashKey = "test-only-hash-key-000000000000000000000"

  it("replaces a phone code with a keyed hash, keeping the attempt count", () => {
    const stored = protectStoredCode(hashKey, "+2348031234567", "123456:0")
    expect(stored).not.toContain("123456")
    expect(stored).toMatch(/^[0-9a-f]{64}:0$/)
  })

  it("covers password-reset codes too", () => {
    const stored = protectStoredCode(
      hashKey,
      "+2348031234567-request-password-reset",
      "654321:0"
    )
    expect(stored).not.toContain("654321")
  })

  it("gives different hashes for the same code on different numbers", () => {
    expect(protectStoredCode(hashKey, "+2348031234567", "123456:0")).not.toBe(
      protectStoredCode(hashKey, "+2348031234568", "123456:0")
    )
  })

  it("leaves other verification rows alone", () => {
    expect(
      protectStoredCode(hashKey, "reset-password:abc", "token-value")
    ).toBe("token-value")
  })
})

describe("roles and permissions", () => {
  it("names every role and grants only known actions", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ROLE_KEYS].sort())
    for (const actions of Object.values(ROLE_PERMISSIONS)) {
      for (const action of actions) expect(KNOWN_ACTIONS.has(action)).toBe(true)
    }
  })

  it("requires a second step for proprietor, school administrator and bursar only", () => {
    expect([...MFA_REQUIRED_ROLES].sort()).toEqual([
      "bursar",
      "proprietor",
      "school_admin",
    ])
  })

  it("lets every role read its own profile and schools", () => {
    for (const role of ROLE_KEYS) {
      const granted = permissionsFor([role])
      expect(granted.has("identity.profile.read")).toBe(true)
      expect(granted.has("identity.membership.list_own")).toBe(true)
    }
  })
})

describe("common passwords", () => {
  it("refuses the obvious ones, whatever the case", () => {
    expect(isCommonPassword("Password123")).toBe(true)
    expect(isCommonPassword("SCHOOL1234")).toBe(true)
    expect(isCommonPassword("a-long-unusual-passphrase")).toBe(false)
  })
})
