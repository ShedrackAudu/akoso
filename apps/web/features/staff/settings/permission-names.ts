// What each permission lets someone do, in the school's words, for the role editor.
// A permission without a name here shows its key, so a new one is never hidden.
const NAMES: Record<string, string> = {
  "identity.profile.read": "See their own profile",
  "identity.profile.update": "Change their own profile",
  "identity.membership.list_own": "See their own schools",
  "audit.event.read": "Read the school's audit log",
  "identity.member.read": "See who has access",
  "identity.member.manage": "Change people's roles and suspend access",
  "identity.role.manage": "Create and change roles",
  "identity.contact.change": "Change someone's sign-in number",
  "identity.mfa.reset": "Reset someone's second sign-in step",
  "identity.security_log.read": "Read the security log",
  "identity.access_review.read": "See the access review",
}

export const permissionName = (key: string): string => NAMES[key] ?? key
