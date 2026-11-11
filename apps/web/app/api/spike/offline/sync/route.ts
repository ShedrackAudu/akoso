// Spike 02: receives a phone's queued changes. A thin wrapper over @akoso/core.
import {
  applySpikeOperations,
  getSpikeSwitches,
} from "@akoso/core/offline-sync"
import { syncRequestSchema } from "@akoso/schemas/offline-sync"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

export async function POST(request: Request): Promise<Response> {
  // Stand-in for real sign-in: the spike can expire the fake teacher's session.
  if ((await getSpikeSwitches()).sessionExpired) {
    return Response.json(
      { error: "signed_out" },
      { status: 401, headers: NO_STORE }
    )
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = syncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: NO_STORE }
    )
  }

  const results = await applySpikeOperations(parsed.data.operations)
  return Response.json({ results }, { headers: NO_STORE })
}
