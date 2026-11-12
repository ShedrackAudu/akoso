import { expect, test } from "@playwright/test"

import { createApiClient } from "@akoso/api-client"
import { CONTRACTS } from "@akoso/schemas/contracts/index"

// The request pipeline in the running app, end to end (spec acceptance criteria 2
// and 5): the public health check answers, carries a request ID, and the typed client
// gets a typed result from it.
test("the health check answers with a request ID", async ({ request }) => {
  const response = await request.get("/api/v1/health")
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: "ok" })
  expect(response.headers()["x-request-id"]).toMatch(/^req_[0-9a-z]{26}$/)
  expect(response.headers()["cache-control"]).toBe("no-store")
})

test("the typed client reads the health check", async ({ baseURL }) => {
  const api = createApiClient(CONTRACTS, { baseUrl: baseURL ?? "" })
  const health = await api.getHealth({})
  expect(health.status).toBe("ok")
})

test("an unknown query field is refused in Problem Details form", async ({
  request,
}) => {
  const response = await request.get("/api/v1/health?debug=1")
  expect(response.status()).toBe(422)
  expect(response.headers()["content-type"]).toBe("application/problem+json")
  expect(await response.json()).toMatchObject({
    code: "validation",
    status: 422,
  })
})
