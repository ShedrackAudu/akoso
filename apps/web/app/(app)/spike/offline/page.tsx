import type { Metadata } from "next"
import type { JSX } from "react"

import { OfflineSpike } from "@/features/staff/offline-spike/offline-spike"

// Spike 02 (docs/specs/stage-1-spike-02-offline-queue.md). Removed when the real
// score sheets replace it.
export const metadata: Metadata = {
  title: "Offline score entry (spike)",
  robots: { index: false, follow: false },
}

export default function Page(): JSX.Element {
  return <OfflineSpike />
}
