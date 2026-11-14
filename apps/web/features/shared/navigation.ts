// The school app's navigation (app frame spec, section 9): one list per experience,
// each item shown only when the person holds its permission in this school. The same
// list feeds the sidebar, the bottom bar and the More sheet, so they never disagree.
// Each Stage 2 screen adds its entry here when it is built; nothing appears before it
// works. Hiding a link is not access control: every page checks on the server too.
import type { FrameNavItem, NavIconKey } from "@akoso/ui/akoso/app-frame"

interface NavEntry {
  key: string
  label: string
  /** Below /{school}; "" is the school's home. */
  path: string
  icon: NavIconKey
  /** The permission that shows it; null for everyone in this experience. */
  permission: string | null
  exact?: boolean
  children?: NavEntry[]
}

const STAFF: NavEntry[] = [
  {
    key: "home",
    label: "Home",
    path: "",
    icon: "home",
    permission: null,
    exact: true,
  },
  {
    key: "setup",
    label: "Setup",
    path: "/setup",
    icon: "setup",
    permission: "setup.school.manage",
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: "settings",
    permission: null,
    children: [
      {
        key: "team",
        label: "People with access",
        path: "/settings/team",
        icon: "people",
        permission: "identity.member.read",
      },
      {
        key: "roles",
        label: "Roles",
        path: "/settings/roles",
        icon: "roles",
        permission: "identity.role.manage",
      },
      {
        key: "security",
        label: "Security log",
        path: "/settings/security",
        icon: "log",
        permission: "identity.security_log.read",
      },
    ],
  },
]

const PARENT: NavEntry[] = [
  {
    key: "home",
    label: "Home",
    path: "/parent",
    icon: "home",
    permission: null,
    exact: true,
  },
]

function build(
  entries: NavEntry[],
  base: string,
  permissions: ReadonlySet<string>
): FrameNavItem[] {
  const items: FrameNavItem[] = []
  for (const entry of entries) {
    if (entry.permission !== null && !permissions.has(entry.permission)) {
      continue
    }
    const children =
      entry.children === undefined
        ? undefined
        : build(entry.children, base, permissions)
    // A group with nothing inside it for this person is not shown at all, and a group
    // leads to its first page (it has no page of its own).
    if (children !== undefined && children.length === 0) continue
    items.push({
      key: entry.key,
      label: entry.label,
      href: children?.[0]?.href ?? `${base}${entry.path}`,
      icon: entry.icon,
      ...(entry.exact === true ? { exact: true } : {}),
      ...(children === undefined ? {} : { children }),
    })
  }
  return items
}

const schoolBase = (slug: string): string => `/${encodeURIComponent(slug)}`

/** The staff navigation for this person in this school. */
export function staffNav(
  slug: string,
  permissions: readonly string[]
): FrameNavItem[] {
  return build(STAFF, schoolBase(slug), new Set(permissions))
}

/** The parent navigation (Payments, Results and Messages arrive in Stages 3 to 5). */
export function parentNav(slug: string): FrameNavItem[] {
  return build(PARENT, schoolBase(slug), new Set())
}

/** Pages for the person, not the school: in More and in the account menu. */
export const ACCOUNT_ITEMS: FrameNavItem[] = [
  { key: "account", label: "My account", href: "/account", icon: "account" },
  {
    key: "security",
    label: "Sign-in and security",
    href: "/account/security",
    icon: "security",
  },
]
