// Better Auth's endpoints (sign-in, codes, MFA, sessions) at /api/auth/*, on the app
// address only: the request proxy refuses every route on a school's address.
import { getAuth } from "@akoso/core/identity"

export const dynamic = "force-dynamic"

const handle = (request: Request): Promise<Response> =>
  getAuth().handler(request)

export const GET = handle
export const POST = handle
