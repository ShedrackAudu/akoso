// Spike 02: the sheet and register a phone downloads to work offline.
import { getSpikeSheet, getSpikeSwitches } from "@akoso/core/offline-sync"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(): Promise<Response> {
  if ((await getSpikeSwitches()).sessionExpired) {
    return Response.json(
      { error: "signed_out" },
      { status: 401, headers: NO_STORE }
    )
  }
  return Response.json(await getSpikeSheet(), { headers: NO_STORE })
}
