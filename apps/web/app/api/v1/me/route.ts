import { getMe } from "@akoso/core/identity"
import { getMe as contract } from "@akoso/schemas/contracts/identity"

import { apiRoute } from "@/server/api"

export const dynamic = "force-dynamic"

export const GET = apiRoute(contract, getMe)
