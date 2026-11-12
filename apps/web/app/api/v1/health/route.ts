import { getHealth } from "@akoso/core/kernel"
import { getHealth as healthContract } from "@akoso/schemas/contracts/system"

import { publicRoute } from "@/server/api"

export const dynamic = "force-dynamic"

export const GET = publicRoute(healthContract, getHealth)
