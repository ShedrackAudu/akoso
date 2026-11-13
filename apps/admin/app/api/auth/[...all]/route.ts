// The team's sign-in endpoints (passkeys, sessions) at /api/auth/*, on the admin address
// only. School sessions mean nothing here: they live in other tables.
import { getTeamAuth } from "@akoso/core/team"

export const dynamic = "force-dynamic"

const handle = (request: Request): Promise<Response> =>
  getTeamAuth().handler(request)

export const GET = handle
export const POST = handle
