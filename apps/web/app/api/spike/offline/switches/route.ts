// Spike 02 only: lock the sheet or expire the fake session, to test what a phone does
// when either happens while it is offline. Nothing like this exists in the real app.
import { getSpikeSwitches, setSpikeSwitches } from "@akoso/core/offline-sync"
import { z } from "zod"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

const switchesSchema = z
  .object({
    sheetLocked: z.boolean().optional(),
    sessionExpired: z.boolean().optional(),
  })
  .strict()

export async function GET(): Promise<Response> {
  return Response.json(await getSpikeSwitches(), { headers: NO_STORE })
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null)
  const parsed = switchesSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: NO_STORE }
    )
  }
  const change: { sheetLocked?: boolean; sessionExpired?: boolean } = {}
  if (parsed.data.sheetLocked !== undefined) {
    change.sheetLocked = parsed.data.sheetLocked
  }
  if (parsed.data.sessionExpired !== undefined) {
    change.sessionExpired = parsed.data.sessionExpired
  }
  return Response.json(await setSpikeSwitches(change), { headers: NO_STORE })
}
