// Builds and serves the service worker at /serwist/sw.js (Serwist's Turbopack mode).
import { createSerwistRoute } from "@serwist/turbopack"

// A new revision each build, so phones replace precached pages after a deploy.
const revision = crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [
      { url: "/~offline", revision },
      // Spike 02: the offline score sheet is cached as soon as the worker installs.
      { url: "/spike/offline", revision },
    ],
  })
