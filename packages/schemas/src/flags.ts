// Feature flags (brief sections 3 and 31; spec stage-1-time-audit-flags.md, section 3).
// Declared here, once, with their default; per-school overrides are data. Every flag is
// off unless Akoso turns it on for a school. Each new feature adds its flag in its spec.

export const FLAGS = {
  "system.example": {
    description: "Used only by tests, to prove the flag mechanism works.",
    default: false,
  },
} as const satisfies Record<
  `${string}.${string}`,
  { description: string; default: boolean }
>

export type FlagKey = keyof typeof FLAGS

export const isFlagKey = (key: string): key is FlagKey => key in FLAGS
