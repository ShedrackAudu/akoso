import { z } from "zod"
import { describe, expect, it } from "vitest"

import type { Database } from "@akoso/db"

import { authorize } from "./authorize"
import { newRequestId } from "./context"
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from "./errors"
import { createLogger } from "./logger"
import { decodeCursor, encodeCursor, toPage } from "./paging"
import { toProblem } from "./problem"
import { memoryLogger, testContext } from "./testing"

const db = {} as Database

describe("toProblem", () => {
  it("maps each expected error to its status and a calm title", () => {
    const cases: [Error, number, string][] = [
      [ValidationError.of("name", "Required"), 422, "validation"],
      [new ForbiddenError(), 403, "forbidden"],
      [new NotFoundError(), 404, "not_found"],
      [new ConflictError(), 409, "conflict"],
      [new RateLimitedError(30), 429, "rate_limited"],
    ]
    for (const [error, status, code] of cases) {
      const mapped = toProblem(error, "req_1")
      expect(mapped.status).toBe(status)
      expect(mapped.body.code).toBe(code)
      expect(mapped.body.requestId).toBe("req_1")
      expect(mapped.body.title).not.toMatch(/!/)
      expect(mapped.unexpected).toBe(false)
    }
  })

  it("lists field errors for validation failures", () => {
    const body = toProblem(ValidationError.of("scores.3", "Too high"), "r").body
    expect(body.errors).toEqual([{ path: "scores.3", message: "Too high" }])
  })

  it("gives the retry delay for rate limits", () => {
    expect(toProblem(new RateLimitedError(17), "r").retryAfterSeconds).toBe(17)
  })

  it("reveals nothing about unexpected errors", () => {
    const mapped = toProblem(
      new Error('relation "internal_ledger" does not exist at /srv/app.js:42'),
      "r"
    )
    expect(mapped.status).toBe(500)
    expect(mapped.unexpected).toBe(true)
    expect(JSON.stringify(mapped.body)).not.toMatch(/internal_ledger|app\.js/)
  })
})

describe("authorize", () => {
  it("denies a user without the permission and allows one with it", () => {
    expect(() => {
      authorize(testContext({ db }), "fees.statement.read")
    }).toThrow(ForbiddenError)
    expect(() => {
      authorize(
        testContext({ db, permissions: ["fees.statement.read"] }),
        "fees.statement.read"
      )
    }).not.toThrow()
  })

  it("trusts the worker's system actor", () => {
    const ctx = {
      ...testContext({ db }),
      actor: { kind: "system", job: "x" },
    } as const
    expect(() => {
      authorize(ctx, "fees.statement.read")
    }).not.toThrow()
  })
})

describe("logger", () => {
  it("writes one JSON line with the context fields", () => {
    const { log, lines } = memoryLogger()
    log
      .child({ requestId: "req_9", tenantId: "t" })
      .info("Request", { status: 200 })
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "info",
      msg: "Request",
      requestId: "req_9",
      tenantId: "t",
      status: 200,
    })
  })

  it("logs only an error's name, message and stack", () => {
    const lines: string[] = []
    const error = Object.assign(new Error("boom"), { phone: "08031234567" })
    createLogger({}, (line) => lines.push(line)).error("Failed", error)
    expect(lines[0]).toContain("boom")
    expect(lines[0]).not.toContain("08031234567")
  })
})

describe("pagination", () => {
  const position = z.object({ createdAt: z.string(), id: z.string() })

  it("round-trips a cursor", () => {
    const value = { createdAt: "2026-11-12T09:00:00Z", id: "a" }
    expect(decodeCursor(encodeCursor(value), position)).toEqual(value)
  })

  it("rejects a cursor it did not make", () => {
    expect(() => decodeCursor("not-a-cursor", position)).toThrow(
      ValidationError
    )
    expect(() => decodeCursor(encodeCursor({ other: 1 }), position)).toThrow(
      ValidationError
    )
  })

  it("uses the extra row only to say there is a next page", () => {
    const rows = [1, 2, 3]
    const full = toPage(
      rows,
      2,
      (row) => row,
      (row) => row * 10
    )
    expect(full.data).toEqual([10, 20])
    expect(full.nextCursor).not.toBeNull()
    expect(
      toPage(
        rows,
        3,
        (row) => row,
        (row) => row
      ).nextCursor
    ).toBeNull()
  })
})

describe("request IDs", () => {
  it("are new each time and carry no information", () => {
    const a = newRequestId()
    expect(a).toMatch(/^req_[0-9a-z]{26}$/)
    expect(newRequestId()).not.toBe(a)
  })
})
