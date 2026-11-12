import { expect, test } from "@playwright/test"

// RFC 9116: the vulnerability contact is served from /.well-known/security.txt
// (brief section 28.2; CI/CD spec, Part A).
test("serves security.txt with a contact and a future expiry", async ({
  request,
}) => {
  const response = await request.get("/.well-known/security.txt")
  expect(response.status()).toBe(200)
  expect(response.headers()["content-type"]).toContain("text/plain")
  const body = await response.text()
  expect(body).toContain("Contact: mailto:security@akoso.ng")
  const expires = /^Expires: (.+)$/m.exec(body)?.[1]
  expect(expires).toBeDefined()
  expect(Date.parse(expires ?? "")).toBeGreaterThan(Date.now())
})
