// Endpoints about the API itself.
import { z } from "zod"

import { defineContract } from "../api"

/**
 * Says the web app is up. Used by uptime checks and the hosting platform's health
 * check, so it is public, skips rate limits and reveals nothing: no version, host or
 * database details.
 */
export const getHealth = defineContract({
  method: "GET",
  path: "/api/v1/health",
  summary: "Whether the API is up",
  public: true,
  input: z.object({}),
  output: z.object({ status: z.literal("ok") }),
  rateLimit: "none",
})
