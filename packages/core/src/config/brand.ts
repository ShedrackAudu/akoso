/**
 * Brand lines and product-family names (brief section 4.0).
 * They live in this one file so a line or a module name can be changed in one place.
 * Use exactly these names in navigation, plan descriptions and help titles; never invent sub-brands.
 */

export const BRAND_NAME = "Akoso"

export const BRAND_LINES = {
  lead: "Your whole school, brought together.",
  alternate: "Run the school. Akoso handles the rest.",
  proprietor: "Know your school, every day.",
  parent: "Your child's school life, in your hand.",
} as const

export const PRODUCT_NAMES = {
  pay: "Akoso Pay",
  reports: "Akoso Reports",
  parent: "Akoso Parent",
  admit: "Akoso Admit",
  staff: "Akoso Staff",
  prefect: "Akoso Prefect",
  insight: "Akoso Insight",
  // Part 2. Hidden until the module is released.
  student: "Akoso Student",
} as const

export type ProductKey = keyof typeof PRODUCT_NAMES
