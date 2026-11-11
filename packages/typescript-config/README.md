# @akoso/typescript-config

Shared TypeScript settings for every app and package.

- `base.json`: strict mode, `noUncheckedIndexedAccess`, no DOM. Used by pure packages
  (`domain`, `schemas`, `core`, `db`, `providers`, `api-client`) and the worker, so web-only
  globals cannot leak into code that must also run in React Native (brief section 5.1).
- `nextjs.json`: adds DOM and JSX for `apps/web` and `apps/admin`.
- `react-library.json`: adds DOM and JSX for `packages/ui`.

Never loosen a strictness flag here without the founder's approval.
