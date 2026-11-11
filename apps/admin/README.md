# apps/admin

The platform admin area for the Akoso team (brief section 26), served at
`admin.<APP_BASE_DOMAIN>`.

It is a separate Next.js app, not a route group in `apps/web`
(`docs/adr/0003-admin-as-separate-app.md`): its own origin and auth cookie, its own bundle
and Content Security Policy, and stricter session rules. School users can never download
or reach admin code.

- Uses `@akoso/ui` for the design system and `@akoso/core` for every use case.
- Every route checks an Akoso team role on the server (brief section 26.2).
- Akoso staff see a school's data only through a consented, time-limited support session.

Run it with `pnpm dev:admin` (port 3001).

**Status:** placeholder page only.
