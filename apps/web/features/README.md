# features

One app, two experiences (brief section 4.0). Each lives in its own folder so a separate
parent app and staff app could be published later from the same code without a rewrite.

- `parent/`: what a parent or guardian sees. Kept small: under 200 KB on first load.
- `staff/`: what school staff and teachers see. Loaded lazily; a parent's phone never
  downloads it.
- `shared/`: building blocks both use (school picker, role switcher, offline indicator).

`parent/` and `staff/` never import each other; both may import `shared/`.

**Status:** empty. The first screens arrive in Stage 1 (sign-in, school picker).
