import { withSerwist } from "@serwist/turbopack"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@akoso/ui", "@akoso/core", "@akoso/schemas"],
  // Do not advertise the framework (brief section 28).
  poweredByHeader: false,
}

// Serwist builds the service worker that lets the app open with no connection
// (brief sections 18 and 20).
export default withSerwist(nextConfig)
