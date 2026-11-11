// Public interface of the offline-sync module. Other modules import only from here.
export * from "./service"

// Spike 02 only, removed when the real score sheets replace it.
export {
  applySpikeOperations,
  getSpikeSheet,
  getSpikeSwitches,
  listSpikeConflicts,
  setSpikeSwitches,
} from "./spike/sync"
export type { SpikeConflict, SpikeSheet, SpikeSwitches } from "./spike/sync"
export {
  SPIKE_ATTENDANCE_STATUSES,
  type SpikeAttendanceStatus,
  type SpikeComponent,
  type SpikeStudent,
} from "./spike/fixtures"
