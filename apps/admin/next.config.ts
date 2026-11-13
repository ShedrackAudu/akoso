import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    "@akoso/ui",
    "@akoso/core",
    "@akoso/schemas",
    "@akoso/domain",
  ],
  // Do not advertise the framework (brief section 28).
  poweredByHeader: false,
}

export default nextConfig
