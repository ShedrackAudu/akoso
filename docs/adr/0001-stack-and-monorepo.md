# ADR 0001: Stack and monorepo layout

- **Status:** Accepted (founder, 11/11/2026, at the section 3.2 checkpoint)
- **Date:** 11/11/2026
- **Brief:** sections 2, 3.1, 33

## Context

The brief fixes the stack (section 2) and the package layout (section 33), and asks for
a modular monolith with clean module boundaries (section 3.1). This record states how
those three fit together and the few choices the brief left to the build.

## Decision

1. **The stack is section 2, unchanged.** TypeScript strict, Next.js App Router, pnpm
   workspaces, PostgreSQL 16 with RLS, Drizzle, Zod, Better Auth, pg-boss, Gotenberg,
   S3-compatible storage, Tailwind and shadcn/ui. "Next.js stays" is on the decision log
   for the founder to sign at the Stage 1 checkpoint.
2. **Layout is section 33**, with `apps/admin` as its own app (ADR 0003) and one extra
   tooling package, `@akoso/typescript-config`.
3. **A module is one name across packages.** The brief organises packages by layer
   (`core`, `db`, `domain`, `schemas`) and also asks that each module own its schema,
   logic and services. So `fees` is `packages/core/src/fees/`,
   `packages/db/src/schema/fees.ts` and `packages/schemas/src/fees.ts`, with its screens
   in the apps. There are 22 modules.
4. **Boundaries are enforced by dependency-cruiser** in CI (`pnpm boundaries`):
   the layer direction, no circular imports, modules import each other only through
   `index.ts`, a module uses only its own schema file, apps never import `@akoso/db`, and
   `domain` and `schemas` use no Node built-ins.
5. **Packages ship TypeScript source.** Next.js compiles them (`transpilePackages`);
   there is no per-package build step or build output to keep in sync.
6. **No Turborepo.** Scripts use `pnpm -r`.
7. **Unused code is checked by knip** (`pnpm unused`).

## Alternatives considered

- **Packages by feature** (`packages/fees` holding its own schema, logic and services).
  Closer to "each module owns everything", but it contradicts the layout in section 33
  and makes "domain never imports the database" a convention inside each package instead
  of a rule between packages.
- **ESLint boundary plugins** instead of dependency-cruiser. Either is named by the
  brief; dependency-cruiser also catches circular dependencies and checks resolved paths
  across workspace packages.
- **Turborepo.** Useful caching for a large repository; unnecessary for an empty one.
- **Building each package to `dist/`.** More moving parts for no present benefit.

## Consequences

- A new developer finds a module by name in three predictable places.
- A boundary violation fails the build with the rule's name and the two files involved.
  This was tested with deliberate violations when the scaffold was built.
- The worker will need a decision on how it is run and built once it has code, because
  it cannot rely on Next.js to compile workspace packages (`docs/tech-debt.md`).
- If the repository grows slow to check, Turborepo can be added without moving a file.

## Toolchain as resolved on 11/11/2026

Next.js 16.4, React 19.3, Tailwind 4, Zod 4.6, TypeScript 5.9, ESLint 10 with
typescript-eslint 8, Vitest 5, dependency-cruiser 18, knip 6, pnpm 12.18, Node 24.
Exact versions are in `pnpm-lock.yaml`.
