# ADR 0002: Design system from shadcn preset `b4bg87xLw8`

- **Status:** Accepted (founder, 11/11/2026, at the section 3.2 checkpoint)
- **Date:** 11/11/2026
- **Brief:** sections 4.1, 4.2
- **Amended 14/11/2026:** at the founder's request the project moved to preset
  `b4bhL8bH3A`. It is the same as `b4bg87xLw8` (neutral base, violet theme, Figtree,
  Merriweather, Phosphor) except for the style: **Mira** (`base-mira`), the compact one,
  instead of Nova. Apply it with `pnpm dlx shadcn@latest apply --preset b4bhL8bH3A`, run
  in `apps/web` (run in `packages/ui` it stops at "could not detect a supported
  framework"), then re-add the components with `add <names> --overwrite`. The record
  below is of the original setup.

## Context

Brief section 4.1 sets the web app's design system to shadcn preset `b4bg87xLw8`, and
section 4.2 says how to initialise it and asks for the CLI output to be recorded here.

## Decision

The web app, the PWA and the platform admin use the preset as generated. We extend it;
we never override its tokens ad hoc.

| Setting          | Value from the preset              | Brief expects                |
| ---------------- | ---------------------------------- | ---------------------------- |
| Style            | Nova (`base-nova`)                 | Nova                         |
| Component base   | Base UI (`@base-ui/react`)         | Whichever the preset defines |
| Base colour      | neutral                            | neutral                      |
| Theme and charts | violet                             | violet                       |
| Radius           | default                            | default                      |
| Menu accent      | subtle                             | subtle                       |
| Body font        | Figtree                            | Figtree                      |
| Heading font     | Merriweather                       | Merriweather                 |
| Icon library     | Phosphor (`@phosphor-icons/react`) | Phosphor                     |

Every value matches the brief, so nothing needed the founder (section 4.2 says to stop
and ask if the icon library or fonts differ).

## How it was set up

1. `pnpm dlx shadcn@latest init --preset b4bg87xLw8 --template next --monorepo`, run in
   a scratch folder with shadcn CLI 4.23. The generated `apps/web` and `packages/ui`
   were then moved into this repository and the package scope renamed from
   `@workspace/*` to `@akoso/*`. (The brief gives the command without `--monorepo` and
   then says to follow the monorepo setup; the flag does both in one step.)
2. `apps/web`, `apps/admin` and `packages/ui` each have a `components.json` with the
   same style, base and aliases. Components install into `packages/ui/src/components/`.
3. The shadcn skill: `pnpm dlx skills add shadcn/ui` (files in `.agents/skills/`, linked
   into `.claude/skills/`, pinned in `skills-lock.json`). It also installed a
   `migrate-radix-to-base` skill from the same source, which this project does not need.
4. The shadcn MCP server: `pnpm dlx shadcn@latest mcp init --client claude` wrote
   `.mcp.json`; the same server is in `.gemini/settings.json`.

## What we changed in the generated files, and why

| File                                                         | Change                                                                              | Why                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `apps/web/app/layout.tsx`                                    | Removed an unused `Geist` import; added `display: "swap"`, metadata and brand icons | Lint; the font-loading rule in section 4.1    |
| `apps/web/components/theme-provider.tsx`                     | Removed the single-key "d" dark-mode shortcut                                       | It fails WCAG 2.1.4 (character key shortcuts) |
| `apps/web/app/page.tsx`                                      | Replaced the template page with an Akoso placeholder                                |                                               |
| `packages/ui/postcss.config.mjs`                             | Removed a type comment that referred to a package that is not installed             | Unused-code check                             |
| Template tooling (Turborepo, the template's ESLint packages) | Not carried over                                                                    | `docs/decisions.md` A-3, A-4                  |

`packages/ui/src/components/button.tsx`, `packages/ui/src/lib/utils.ts` and
`packages/ui/src/styles/globals.css` are exactly as generated.

## Rules that follow

- Add components with the CLI or the MCP tools; never paste code from a website.
- Generated components live in `packages/ui/src/components/` and are not hand-edited.
  Akoso components live in `packages/ui/src/akoso/`.
- Phosphor is the only icon library. ESLint fails the build on imports from
  `lucide-react`, `@tabler/icons-react` and other icon packages (tested when the scaffold
  was built). Icons render through `Icon` in `@akoso/ui/akoso/icon`, which allows only
  the `regular` and `fill` weights and three sizes.
- Fonts load through `next/font`, which self-hosts them at build time.
- A school's colour is applied through a scoped `--brand` CSS variable, never by editing
  preset tokens.
- To change the preset later: `shadcn apply --preset <code>` on a branch, then review
  the visual changes.
- The native mobile apps and the public website do not use this preset.

## Notes

- `cn` is a small package published by shadcn (`github.com/shadcn-ui/cn`), a
  replacement for `clsx` with `tailwind-merge`. It arrived with the preset.
- The preset also sets a monospace font (Geist Mono), kept as generated.
- Semantic status tokens (success, warning, destructive, info) are added on top of the
  preset when the first status badge is built.

## `shadcn info --json` (run in `apps/web`, 11/11/2026)

Local paths are shown relative to the repository root.

```json
{
  "project": {
    "framework": "Next.js",
    "frameworkName": "next-app",
    "frameworkVersion": "16.4.4",
    "srcDirectory": false,
    "rsc": true,
    "typescript": true,
    "tailwindVersion": "v4",
    "tailwindConfig": null,
    "tailwindCss": null,
    "importAlias": "@"
  },
  "config": {
    "style": "base-nova",
    "base": "base",
    "rsc": true,
    "typescript": true,
    "iconLibrary": "phosphor",
    "rtl": false,
    "menuColor": "default",
    "menuAccent": "subtle",
    "aliases": {
      "components": "@/components",
      "utils": "@akoso/ui/lib/utils",
      "ui": "@akoso/ui/components",
      "lib": "@/lib",
      "hooks": "@/hooks"
    },
    "resolvedPaths": {
      "cwd": "./apps/web",
      "tailwindConfig": null,
      "tailwindCss": "./packages/ui/src/styles/globals.css",
      "utils": "./packages/ui/src/lib/utils.ts",
      "components": "./apps/web/components",
      "lib": "./apps/web/lib",
      "hooks": "./apps/web/hooks",
      "ui": "./packages/ui/src/components"
    },
    "registries": {
      "@shadcn": "https://ui.shadcn.com/r/styles/{style}/{name}.json"
    }
  },
  "preset": {
    "code": "b4bg87xLw8",
    "fallbacks": [],
    "values": {
      "style": "nova",
      "baseColor": "neutral",
      "theme": "violet",
      "chartColor": "violet",
      "iconLibrary": "phosphor",
      "font": "figtree",
      "fontHeading": "merriweather",
      "radius": "default",
      "menuAccent": "subtle",
      "menuColor": "default"
    }
  },
  "components": ["button"],
  "links": {
    "docs": "https://ui.shadcn.com/docs",
    "components": "https://ui.shadcn.com/docs/components/base/[component].md",
    "ui": "https://ui.shadcn.com/code/apps/v4/registry/bases/base/ui/[component].tsx",
    "examples": "https://ui.shadcn.com/code/apps/v4/registry/bases/base/examples/[component]-example.tsx",
    "schema": "https://ui.shadcn.com/schema.json"
  }
}
```
