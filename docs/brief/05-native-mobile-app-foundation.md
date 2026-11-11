## 5. Native mobile app foundation (React Native + Expo)

Later, parents and teachers will get native iOS and Android apps built with React Native and Expo. For now, set up only the **foundation**, so the native app can grow without rework. The PWA (sections 18–20) remains the main parent and teacher experience at launch.

### 5.1 Make the backend ready for a second client (from Stage 1)

- Put every use case (e.g. `getFamilyBalance`, `submitScoreSheet`, `listMyClasses`) in service functions in `packages/core` that take an authenticated context (user, tenant, roles). Server actions and API route handlers are thin wrappers that call these services. Never put business logic only in a server action or a React component.
- Expose a versioned REST API at `/api/v1` for parent and teacher use cases, with Zod-validated input and output from `packages/schemas`, a consistent error format, pagination, idempotency keys on writes and rate limits.
- Generate an OpenAPI spec from the Zod schemas, and a typed client in `packages/api-client` for the mobile app.
- Authentication: Better Auth with its Expo integration, the same phone OTP and roles, and tokens kept in secure device storage. Keep the mobile sign-in flow open to more than one method, so the student sign-in (admission number and PIN, Part 2, section 43) can be added to the Expo app without rework. The client sends the selected school in a header; the server verifies membership on every request.
- Push notifications: a `devices` table for push tokens per user, and an Expo push adapter in the messaging service alongside web push.
- Keep `packages/domain`, `packages/schemas` and constants free of web-only or Node-only imports so they also run in React Native.

### 5.2 Scaffold `apps/mobile` (Stage 7)

- Expo (latest SDK), TypeScript strict and Expo Router, inside the pnpm monorepo, with Metro configured for workspace packages.
- **Design:** the native apps have their own visual design, separate from the web app. Do not use the shadcn preset, its tokens or shadcn-style React Native component kits. I will provide the mobile design style and guidelines (colours, typography, components, iconography and motion) before the apps grow beyond the foundation. Until then:
  - Build the foundation screens with neutral placeholder styling.
  - Keep every design value (colours, fonts, spacing, radius) in one theme module inside `apps/mobile`, so the guidelines can be applied in one place.
  - Choose the styling approach (e.g. NativeWind or React Native StyleSheet with a theme) in an ADR, and keep it neutral enough to fit any design I provide.
  - Still apply the Akoso brand rules from section 4.0 (app names, icons as replaceable assets, voice, school first) and the accessibility basics: minimum 16 px body text, 44 px tap targets, and readable contrast.
- Data fetching with TanStack Query through `packages/api-client`.
- Foundation screens only: splash, phone OTP login, school picker, role switcher, parent home (children with balance and account number, read-only), teacher home (my classes, read-only), settings and log out.
- Expo push registration wired to the `devices` table; the platform admin can send a test notification.
- EAS Build and EAS Update with development, preview and production profiles; one app with the display name "Akoso" and a placeholder bundle identifier (e.g. `ng.akoso.app`, to be confirmed) and placeholder icon, kept for every future release because this Expo app will be Akoso's first store listing (there is no earlier store wrapper of the PWA); the app configuration is written so that separate parent and staff variants could be added later (section 4.0); environment variables per profile.
- Sentry for React Native.
- CI: typecheck, lint and unit tests for `apps/mobile` on every pull request.
- `docs/mobile.md` explaining how to run the app on an Android phone or emulator with a development build, and listing what remains to build.
- Decide the offline storage approach for mobile (e.g. expo-sqlite) in an ADR, but do not build it yet.

### 5.3 Not now

Feature parity with the PWA, offline score entry on mobile, in-app payments, App Store and Play Store listings, and store submissions. I will instruct these later.

Acceptance: a test parent logs in on an Android phone using the development build, sees their children and balances from the staging API, and receives a test push notification. A test teacher sees their class list.

