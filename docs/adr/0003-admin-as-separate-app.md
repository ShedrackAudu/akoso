# ADR 0003: Platform admin as a separate app

- **Status:** Accepted (founder, 11/11/2026)
- **Brief:** sections 26, 26.2, 33

## Context

Section 33 leaves it open: the platform admin is `apps/admin`, "or a route group in
web". Section 26 requires it to be on its own subdomain with explicit server-side role
checks and MFA, and section 26.2 requires stricter account security for the Akoso team
(passkeys, short idle timeouts, re-authentication before risky actions).

## Decision

The platform admin is its own Next.js app, `apps/admin`, served at
`admin.<APP_BASE_DOMAIN>`.

## Why

- **Its own origin and cookie.** A school user's session cookie on `app.<domain>` is
  never sent to the admin, and an admin session never reaches the school app.
- **Its own bundle.** No admin code is ever shipped to a parent's or teacher's phone,
  and a mistake in a route guard cannot expose an admin screen in the school app.
- **Its own security settings.** Content Security Policy, session lifetime and
  sign-in methods can be stricter without special cases in the school app's middleware.
- **Deployable separately.** The admin can be deployed, restricted by network or taken
  down without touching the app schools use.

## Alternative considered

A route group in `apps/web`, routed by middleware from the admin subdomain. One
deployable is simpler to run, but admin and school code would share a build, one set of
middleware and one origin configuration, and isolation would depend on that middleware
being right every time.

## Consequences

- A second deployable to build, deploy and monitor.
- Both apps use `@akoso/ui` and call `@akoso/core`; no use case is written twice.
- The apps must not import each other; the boundary check enforces it.
- The agent portal (section 26.4) is **not** part of this app: the brief places it at
  the app address with an agent role, so it lives in `apps/web`.
