import { listMySchools } from "@akoso/core/identity"
import { listMySchools as contract } from "@akoso/schemas/contracts/identity"

import { apiRoute } from "@/server/api"

export const dynamic = "force-dynamic"

export const GET = apiRoute(contract, listMySchools)
