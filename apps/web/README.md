# apps/web

The Akoso app at `app.<APP_BASE_DOMAIN>`: the installable PWA for parents and staff, the
school admin and bursar screens, and the versioned REST API at `/api/v1`. It also serves
each school's public pages at `<slug>.<APP_BASE_DOMAIN>` (brief sections 4.0 and 7).

| Folder             | What it holds                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `app/`             | Routes, layouts, server actions and `/api/v1` route handlers. All of them are thin wrappers that call `@akoso/core` |
| `features/parent/` | The parent experience (Akoso Parent)                                                                                |
| `features/staff/`  | The staff and teacher experience (Akoso Staff), loaded lazily so parents never download it                          |
| `features/shared/` | Building blocks both experiences use                                                                                |
| `components/`      | App-level components that are not part of the design system                                                         |
| `public/`          | Brand icons copied from the brand kit (replaceable assets)                                                          |

## Rules

- No business logic in a component or only in a server action. Put it in `@akoso/core`.
- Never import `@akoso/db`. The import-boundary check fails the build if you do.
- Permissions are checked on the server for every operation; hiding a button is not access control.
- Auth cookies are set only on this origin, never on a school subdomain or custom domain.

Run it with `pnpm dev` (port 3000).

**Status:** placeholder page only.
