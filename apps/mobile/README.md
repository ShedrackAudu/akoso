# apps/mobile

The React Native and Expo app foundation (brief section 5). **Not started: it is built
in Stage 7.** This folder is deliberately not yet a workspace package.

What will be here, and no more: splash, phone OTP sign-in, school picker, role switcher,
a read-only parent home, a read-only teacher home, settings and log out, with Expo push
registration and EAS profiles.

Notes for when it starts:

- It has its own visual design, separate from the web app. Do not use the shadcn preset
  or shadcn-style React Native kits. The founder provides the mobile design guidelines.
- Keep every design value in one theme module.
- It talks to `/api/v1` through `@akoso/api-client`, and reuses `@akoso/domain` and
  `@akoso/schemas`, which is why those packages may not use Node or web-only imports.
- Splash and icon assets, an `AnimatedSplash` component and Lottie files are ready in the
  brand kit (`akoso-refs/akoso-brand-kit/expo/`, kept outside the repository).
