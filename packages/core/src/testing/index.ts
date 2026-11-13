// Test-only helpers. Only test files import this module; production code never builds a
// signed-in context without sign-in (the boundary check refuses any non-test import of this module).
import type { ActionKey } from "@akoso/schemas/api"

import type { Database } from "@akoso/db"

import { createLogger, type Logger, type RequestContext } from "../kernel/index"

/** Collects log lines in memory, parsed, so tests can assert what would be logged. */
export function memoryLogger(): { log: Logger; lines: string[] } {
  const lines: string[] = []
  return {
    log: createLogger({}, (line) => lines.push(line)),
    lines,
  }
}

/** A signed-in context for tests. */
export function testContext(
  overrides: Partial<Omit<RequestContext, "actor">> & {
    db: Database
    userId?: string
    permissions?: readonly ActionKey[]
  }
): RequestContext {
  const { userId = "user_test", permissions = [], ...rest } = overrides
  const tenantId = rest.tenantId ?? null
  return {
    requestId: "req_test",
    tenantId,
    // An active test school matching tenantId, unless the test gives its own.
    school:
      tenantId === null
        ? null
        : {
            id: tenantId,
            slug: "test-school",
            name: "Test School",
            status: "active",
            timeZone: "Africa/Lagos",
          },
    now: () => new Date("2026-11-12T09:00:00Z"),
    log: createLogger({}, () => undefined),
    ...rest,
    actor: {
      kind: "user",
      userId,
      roles: [],
      permissions: new Set(permissions),
    },
  }
}
