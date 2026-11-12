/** Answers the health check. Deliberately says nothing beyond "up". */
export function getHealth(): Promise<{ status: "ok" }> {
  return Promise.resolve({ status: "ok" })
}
