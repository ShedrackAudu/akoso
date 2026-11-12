// Keeps packages/api-client/openapi.json in step with the contracts. CI fails when the
// committed document is out of date; `pnpm api:openapi` rewrites it after a change.
// Removing or renaming anything in /api/v1 breaks the mobile app: such changes belong
// in /api/v2 (spec section 7), and a reviewer sees them in this file's diff.
import { describe, expect, it } from "vitest"

import { CONTRACTS } from "@akoso/schemas/contracts/index"
import { buildOpenApi } from "@akoso/schemas/openapi"

const document = buildOpenApi(CONTRACTS, { title: "Akoso API", version: "1" })

describe("the OpenAPI document", () => {
  it("is OpenAPI 3.1 with every contract as an operation", () => {
    expect(document.openapi).toBe("3.1.0")
    const paths = document.paths as Record<
      string,
      Record<string, { operationId: string }>
    >
    const operationIds = Object.values(paths).flatMap((methods) =>
      Object.values(methods).map((operation) => operation.operationId)
    )
    expect(operationIds.sort()).toEqual(Object.keys(CONTRACTS).sort())
  })

  it("matches the committed openapi.json", async () => {
    await expect(`${JSON.stringify(document, null, 2)}\n`).toMatchFileSnapshot(
      "../openapi.json"
    )
  })
})
