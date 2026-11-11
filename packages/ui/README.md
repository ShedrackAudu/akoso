# @akoso/ui

The design system for the web app, the PWA and the platform admin. It comes from shadcn
preset `b4bg87xLw8` (style Nova on Base UI, neutral base, violet theme, Figtree body,
Merriweather headings, Phosphor icons). See `docs/adr/0002-design-system.md`.

| Folder                   | What it holds                                                                                                                   | Who writes it                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/components/`        | shadcn components                                                                                                               | The shadcn CLI or MCP server only. Do not hand-edit; if you must, say why in the PR |
| `src/akoso/`             | Akoso components built on top: `Icon`, and later status badges, naira amounts, score cells, the offline indicator, empty states | Us                                                                                  |
| `src/styles/globals.css` | The preset's tokens                                                                                                             | The shadcn CLI. Extend; never override a token ad hoc                               |
| `src/lib/`, `src/hooks/` | Helpers the components need                                                                                                     | Either                                                                              |

## Rules

- Add components with `pnpm dlx shadcn@latest add <name>` (run in `apps/web`) or the MCP
  tools. Never paste component code from a website.
- Phosphor is the only icon library. A registry component that imports another icon
  package must have those imports replaced; lint fails the build otherwise.
- Render every icon through `Icon` from `@akoso/ui/akoso/icon`.
- No business logic and no data access here. It may use types from `@akoso/schemas`.
- A school's colour is applied through a scoped `--brand` CSS variable, never by editing
  preset tokens.
