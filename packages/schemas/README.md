# @akoso/schemas

Shared Zod schemas, used by the browser, the server, the worker and the mobile app. They are the single source of truth for input and output shapes: TypeScript types are derived from them, never written twice (brief section 3.1).

- One file per module, named after the module.
- No web-only or Node-only imports, so the package also runs in React Native (brief section 5.1).

**Status:** placeholders only.
