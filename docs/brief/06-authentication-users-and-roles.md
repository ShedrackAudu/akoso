## 6. Authentication, users and roles

Implement real authentication with Better Auth.

Features:

- Parent login by phone number with one-time passcode (OTP) by SMS or WhatsApp (WhatsApp OTP uses an approved authentication template)
- Staff login by email (or phone) and password
- Multi-factor authentication available to all staff roles; required for proprietor, admin, bursar and all Akoso team roles (section 26.2), and enforceable by the school for any other staff role
- Email/phone verification, password reset, secure session cookies (HttpOnly, Secure, SameSite)
- Session rotation on login and on privilege change; session expiry and "log out all devices"
- Rate-limited login and OTP attempts with lockout and alerting
- CSRF protection on all state-changing requests
- Login and security event log visible to the school's proprietor
- Profile editing and account deletion workflow
- One user can belong to several schools and hold several roles (e.g. a teacher who is also a parent); a school picker appears after login
- **Changing a phone number (account recovery).** Parents often change SIM cards and lose their number. A school admin can change a guardian's login number after checking their identity (in person or by video call, recorded with the reason). The change is audit-logged, the old number and any email on file get a notice, active sessions are signed out, and changes are rate-limited. Parents can add a second verified number or email as a backup login. Staff with an email login reset it themselves.

Never store plaintext passwords or OTPs. Never log tokens or OTP codes.

Acceptance: OTP login completes within 60 seconds on a throttled 2G/3G connection.

Roles:

| Role | Scope |
| --- | --- |
| Akoso team (Owner, Support, Onboarding, Finance, Sales, Ops) | Our team only, in the separate admin area; each role sees only what its job needs (section 26.2) |
| Agent | External sales agents: their own referral portal only (section 26.4) |
| Group owner | Owns several branches; consolidated view |
| Proprietor | Full control of one school |
| School administrator | Setup, students, results publishing |
| Bursar | Fees, payments, expenses, payroll |
| Head teacher / principal | Approves results, lesson notes, behaviour |
| Vice principal | Head-teacher permissions the school chooses to delegate |
| Safeguarding lead | Restricted pastoral notes, custody restrictions, safeguarding alerts |
| School nurse / sick bay | Health records and sick-bay visits for all students |
| Accountant / auditor | Read-only finance: fees, payments, payouts, expenses and payroll reports |
| Teacher | Own classes and subjects |
| Gate / front desk staff | Pickup verification (and the visitor log once Part 2 is built) |
| Parent / guardian | Own children only |
| Student | Not in Part 1. Student accounts are a Part 2 module (section 43): JSS1–SS3, created only with guardian consent, own data only. In Part 1, keep the data model and authentication set-up ready so a student sign-in method (admission number and PIN) can be added later without rework |

Enforce permissions on the server for every operation through a central permission check. Hiding a button is not access control. Keep a permissions matrix in `docs/permissions.md` and generate tests from it.

Schools can also create **custom roles** (e.g. "Exams officer", "Admissions officer") by combining permissions from the matrix, and give one person several roles. Some permissions stay restricted to named roles and can only be added to a custom role with the proprietor's explicit approval: health records, restricted notes, custody restrictions, payroll and settlement-account changes.

