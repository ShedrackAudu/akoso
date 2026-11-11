import type { MetadataRoute } from "next"

import { BRAND_LINES, BRAND_NAME } from "@akoso/core/config"

// The installable app's manifest (brief section 18). The name is "Akoso", capital A
// (section 4.0). Install icons are PNG because the manifest format needs them;
// everywhere else the logo is SVG (decision D-5).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: BRAND_LINES.lead,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#8B5CF6",
    theme_color: "#8B5CF6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
