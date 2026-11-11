## 4. Design and branding

### 4.0 The Akoso brand

**Name:** Akoso, from the Yoruba word *àkóso* (pronounced ah-KOH-so), meaning administration, coordination and management. Its roots are *kó* (to gather) and *so* (to tie): "gathering and tying together". Write it "Akoso" in the product and running text: capital A, never all caps. The tonal spelling *àkóso* is used only where the name's meaning is explained (e.g. the About page).

**Brand story:** a school runs on loose threads: fees, results, attendance, staff and parents. Akoso gathers those threads and ties them into one system, so the school runs as one.

**Positioning and promise:** Akoso is the operating system for modern Nigerian schools, bringing fees, results, attendance, staff and parents together in one place. The promise is **order and visibility across the whole school, every day**. In practice: a bursar can see who has paid; a head teacher sees results that are correct; a proprietor knows the state of the school at a glance; a parent sees their child's school life on their phone. Every screen should serve one of these.

**Brand lines** (store as editable configuration, not hard-coded):

- Lead line and logo lockup: "Akoso — Your whole school, brought together."
- Login, onboarding and the sales demo tenant: "Your whole school, brought together." with "Run the school. Akoso handles the rest." as an alternate.
- Proprietor dashboard empty states and onboarding: "Know your school, every day."
- Parent app welcome and install screens: "Your child's school life, in your hand."

**Voice and tone** for every UI string, empty state, error, notification and message template:

- Calm, confident and precise, like a trusted bursar or head teacher. It reassures rather than hypes. No exclamation marks and no emojis in system messages. State numbers plainly ("₦45,000 received. Balance: ₦15,000.").
- Warm to parents, and about their child by name: "Chidi's term 2 report card is ready", not "Result published"; "We received ₦45,000 for Chidi and Ada", not "Payment successful".
- Respectful to proprietors: speak about *their* school, *their* standards, *their* parents. The school is the hero; Akoso stays in the background.
- Errors say what happened and what to do next, without blame ("This score is above the CA1 maximum of 10. Please check it.").
- Keep a short voice guide with do/don't examples in `docs/brand-voice.md`, and review every message template against it.

**Product family:** every module carries the Akoso name. Use exactly these names in navigation, plan descriptions (section 25), help-centre titles and the platform admin, and never invent other sub-brands:

| Module | Covers (sections) |
| --- | --- |
| Akoso Pay | Fees, invoices, payments, reconciliation, receipts, debtors (13, 14) |
| Akoso Reports | Score entry, results engine, report cards, broadsheets, transcripts (11, 12) |
| Akoso Parent | The parent experience in the Akoso app and parent communication (17, 18) |
| Akoso Admit | Admissions and enrolment (22) |
| Akoso Staff | Staff records, the teacher experience in the Akoso app, payroll, and timetables when built (9, 15, 19, Part 2) |
| Akoso Prefect | Student and staff attendance, behaviour, pickup safety (21) |
| Akoso Insight | Dashboards, reports and analytics for proprietors (23) |
| Akoso Student | Student accounts and the student experience in the Akoso app (Part 2, section 43); hidden until the module is released |

Features that fit none of these (setup, imports, expenses, messaging credits) appear under plain names such as "Setup" or "Expenses", not new sub-brands. Keep module names in one configuration file so a name (for example Akoso Parent, for which a warmer name is under consideration) can be changed in one place.

**One app: "Akoso".** Parents and staff use the same app, named simply "Akoso": the installable PWA now (section 18) and the Expo app later (section 5). It lives at one address, `app.akoso.ng` (section 7). There is no Play Store or App Store wrapper of the PWA; the first store listings will be the Expo app when it is ready. After login, the app shows the experience for the user's role: the parent experience (Akoso Parent) or the staff and teacher experience (Akoso Staff). A user with both roles, such as a teacher who is also a parent, switches between them with the role switcher, without logging out. "Akoso Parent" and "Akoso Staff" are product names used in the website, pricing and help centre, not separate apps.

- Permissions are enforced on the server for every role (section 6), so a parent can never reach staff screens or data, whatever the client shows.
- Keep each experience in its own feature folders (parent and staff) with shared building blocks, and load staff-only screens lazily, so parents' phones never download or run staff code they do not need.
- Stricter staff rules (MFA for staff roles, offline score storage, shorter idle timeouts) apply per role inside the same app.
- **Ready to split later:** structure the code so a separate parent app and staff app could be published from the same codebase (e.g. EAS build variants with their own names, icons and bundle identifiers) without a rewrite. Do not split now; I will decide later based on usage.
- Use one icon drawn from the brand's "gather and tie" idea (see logo direction below); create a placeholder and keep the final artwork as a replaceable asset.

**Brand colours and logo direction (for reference):** deep indigo, a nod to *adire* (the Yoruba indigo-dyed cloth), paired with warm gold or ochre for a premium, academic feel. The logo direction is threads tied into a knot or interlocking strands, with a subtle adire pattern as an optional background texture. These guide brand assets (logo, icons, receipts, report-card attribution, emails). They do not override the web app's design system (section 4.1) or the design guidelines I will provide for the mobile apps and the website; check contrast for accessibility wherever indigo and gold are used together.

**School first, Akoso second:** inside a school's portal, report cards and receipts, the school's name, logo and colour lead. Akoso appears only as a small, quiet attribution:

- School web address: `{slug}.akoso.ng` (e.g. `greenfield.akoso.ng`), or the school's own domain (section 7.1), for the school's public pages (admissions, document verification). Inside the app at `app.akoso.ng`, the selected school's name, logo and colour lead. Keep the base domain in configuration (`APP_BASE_DOMAIN`), not in code.
- Report card footer: "Results prepared with Akoso" (section 12).
- Receipt header line: "{School name} · Official Receipt · Powered by Akoso" (section 14).
- Emails, SMS and WhatsApp messages are signed with the school's name, not Akoso's (sender IDs and templates in section 17).

### 4.1 Interface design

Create a calm, trustworthy, professional interface that a proprietor is proud to show parents, matching the brand promise: order and visibility, with nothing hidden or confusing.

**The web app's design system comes from shadcn preset `b4bg87xLw8`.** The preset defines the colours, fonts, radius, icon library and component base: style Nova, neutral base colour, violet theme and charts, default radius, subtle menu accent, **Figtree** for body text, **Merriweather** for headings, and **Phosphor** icons. Load both fonts with `next/font` (self-hosted, only the weights you use, `display: swap`) so pages stay light on slow connections. Extend the preset; never override its tokens ad hoc. The preset applies to the web app and the Akoso PWA (parent and staff experiences) only. The native mobile apps (section 5.2) and the public website have their own visual designs, defined by guidelines I will provide later.

**Icons:** the preset uses **Phosphor Icons** (`@phosphor-icons/react`). Use only Phosphor icons in the web app and PWA; never add or mix in another icon library (Lucide, Tabler, Hugeicons or any other). Most shadcn registry components import Lucide icons by default: when you add a component, replace those imports with the Phosphor equivalent, and add a lint rule that fails the build on imports from `lucide-react`, `@tabler/icons-react` or any other icon package. Use the current `...Icon` export names (e.g. `HouseIcon`, not the older `House`). In React Server Components, import from `@phosphor-icons/react/ssr`; in client components, from `@phosphor-icons/react`. Wrap icons in a small `Icon` component in `packages/ui` with consistent sizes (e.g. 16, 20, 24 px) and one default weight (`regular`), so every screen looks the same. Import icons individually so unused icons are not bundled. Icon-only buttons always have an accessible label.

**Outline and filled icons:** every Phosphor icon comes in six weights (thin, light, regular, bold, fill, duotone), set with the `weight` prop. Use only two: **`regular`** (outline) by default, and **`fill`** (e.g. `<HouseIcon weight="fill" />`) where it makes the interface clearer. Do not use thin, light, bold or duotone. Use filled icons in these cases:

- **Active and selected states:** the current tab in the bottom navigation and sidebar, a selected filter or toggle, a starred or pinned item. Pair the filled icon (active) with the outline version of the same icon (inactive), so the change of state is obvious at a glance.
- **Status indicators:** small icons inside status badges and alerts (paid, overdue, approved, warning, error), where a solid shape reads better than thin lines, always alongside text, never colour or icon alone.
- **Small sizes:** at 16 px and below, prefer the filled weight, because thin outline strokes become hard to see on low-end phone screens.
- **Key emphasis:** sparingly, for one primary item on a screen (e.g. the "Pay now" or "Report card ready" card), not for every icon.

Rules: keep outline icons for general actions, menus, forms and lists; never mix outline and filled icons for items of equal importance in the same group; switch between outline and filled by changing the weight of the same icon, never by swapping in a different icon; and handle the choice inside the shared `Icon` component (e.g. a `filled` or `active` prop that sets `weight="fill"`), so the rule is applied the same way everywhere.

On top of the preset:

- Semantic status tokens: success (paid, approved), warning (partial, pending), destructive (overdue, error), info. Reuse preset tokens where they exist.
- Large, readable type (minimum 16 px body on mobile) and tap targets of at least 44 px.
- **Accessibility:** meet WCAG 2.2 AA across the web app and PWA: colour contrast, keyboard use on desktop, visible focus, a label on every input, names on icon-only buttons, status shown with text and never colour alone, and respect for the phone's text-size setting. Check every screen with automated tests (e.g. axe), plus a manual keyboard and screen-reader pass on key flows (section 30).
- Each school's logo and brand colour applied to its portal, report cards and receipts through a scoped `--brand` CSS variable, checked for contrast. Never edit preset tokens per school.
- Light and dark themes as provided by the preset.

Avoid clutter, heavy animations, large images on parent pages and unreadable small text.

Design mobile-first for low and mid-range Android phones (2 GB RAM, 720p screens), then scale up to tablets and desktops. Teacher and parent screens must work one-handed on a phone. Admin and bursar screens may be denser on desktop.

Build app-specific components in `packages/ui` on top of shadcn components: status badges, naira amount display (₦ with thousands separators), score-entry grid cells, offline indicator, empty states, loading skeletons and confirmation dialogs.

Formats: dates as dd/mm/yyyy, phone numbers in +234 format, currency in naira and kobo, English UI. Message templates may have Pidgin, Yoruba, Hausa and Igbo versions. The UI itself stays in English (full UI translation is out of scope, section 24); schools can override report-card labels instead (section 12).

### 4.2 shadcn/ui setup (do this in Stage 1)

1. **Initialise shadcn with the preset**, non-interactively, in the web app:

```bash
pnpm dlx shadcn@latest init --preset b4bg87xLw8 --template next
```

Use the component base library (Radix or Base UI) that the preset defines. Because this is a monorepo, follow shadcn's monorepo setup so `apps/web` and `packages/ui` each have a `components.json` with matching style, base and aliases. Then run `pnpm dlx shadcn@latest info --json` and record the output in `docs/adr/0002-design-system.md`.

2. **Install the shadcn skill** so AI agents know the project's configuration and shadcn's composition rules:

```bash
pnpm dlx skills add shadcn/ui
```

Commit the files it adds.

3. **Add the shadcn MCP server** so agents can search, view and install registry components:

```bash
pnpm dlx shadcn@latest mcp init --client claude
```

This writes `.mcp.json` for Claude Code. For Gemini CLI, add the same server (command `npx`, args `shadcn@latest mcp`) under `mcpServers` in `.gemini/settings.json`. Commit both files.

4. **Rules for agents:**
   - Add components with `shadcn add` or the MCP tools. Never paste component code from websites.
   - Search the registry and docs (`shadcn search`, `shadcn docs`) before writing a custom component.
   - Do not hand-edit generated files in `components/ui` unless necessary, and note why in the PR.
   - To change the preset later, run `shadcn apply --preset <code>` on a branch and review the visual changes.
   - After initialising, confirm that `components.json` lists Phosphor as the icon library, that `@phosphor-icons/react` is installed, and that the fonts are Figtree (body) and Merriweather (headings); if the CLI shows another icon library or font, stop and ask me.
   - CLI flags change between versions: check `shadcn --help` if a command fails, and ask me before improvising.

