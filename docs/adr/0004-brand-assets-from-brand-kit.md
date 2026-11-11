# ADR 0004: Brand assets from the brand kit

- **Status:** Accepted (founder, 11/11/2026)
- **Brief:** section 4.0

## Context

Brief section 4.0 describes the brand as deep indigo with warm gold or ochre and a logo
of "threads tied into a knot or interlocking strands", and tells agents to create a
placeholder icon. The founder's brand kit (Brand Overview dated 22 October 2026) has
since settled the brand differently and contains finished artwork:

- **Colours:** violet `#8B5CF6`, deep purple `#2E1065`, lavender `#EFE8FE`, white
  `#FEFEFE`. Gold may return as an occasional accent on certificates and report cards.
- **Logo:** a ring of violet beads strung around one larger bead (a garland), in two
  variants, **tassel** and **plain**, above a lowercase serif "akoso".
- Finished app icons, splash screens, Lottie animations and two patterns (adire, swirl).

The two sources disagree, so the founder was asked (brief section 3.3).

## Decision

1. **The brand kit supersedes** the colour and logo direction in section 4.0. Where the
   two differ, the brand kit wins.
2. Akoso uses the **tassel** variant.
3. The app uses the real artwork, not a placeholder. Icons are still **replaceable
   assets**: files in `apps/*/public/`, referenced by name, never inlined.
4. Colourway for the app icon and favicon: **violet** (founder, 11/11/2026). The
   scaffold first used deep purple, the agent's pick; the founder replaced it.
5. The brand kit itself stays outside the repository, in `akoso-refs/akoso-brand-kit/`
   (gitignored). Only the files the app uses are copied in.

## What was copied

From `akoso-refs/akoso-brand-kit/app-icons/tassel/violet/web/`:

- `apps/web/public/`: `favicon.ico`, `favicon.svg`, `favicon-16.png`, `favicon-32.png`,
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- `apps/admin/public/`: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`

From `akoso-refs/akoso-brand-kit/logos/svg/`, into `public/brand/` in both apps:

- `akoso-mark-tassel-on-light.svg` (for light backgrounds)
- `akoso-mark-tassel-on-deep.svg` (for dark backgrounds)

## SVG first

Logos and brand marks are shown from the SVG wherever possible (founder, 11/11/2026),
so they stay crisp at every size. PNGs are kept only where a format requires one: the
install icons for the web manifest, the Apple touch icon and the `.ico` favicon. Add
the full logo with its wordmark (`akoso-logo-tassel-*.svg`, about 27 KB each) only
where a screen needs it, and mind the parent experience's size budget.

The web manifest is not copied yet; it is written with the PWA (Serwist) setup, where
the name is "Akoso" with a capital A as section 4.0 requires (the kit's sample manifest
uses lowercase).

## What does not change

- **The web app's design system is still the shadcn preset** (ADR 0002). Brand colours
  guide brand assets (logo, icons, receipts, report-card attribution, emails); they do
  not override preset tokens. The preset's violet theme and the brand's violet were
  chosen to match.
- **School first, Akoso second.** Inside a school's portal, report cards and receipts,
  the school's name, logo and colour lead.
- The name is written "Akoso" in the product and running text. The lowercase "akoso" is
  the wordmark only.
- Voice, brand lines and product-family names in section 4.0 are unaffected.

## Motion rules from the brand kit (for later stages)

Never spin the logo; keep the splash to about 2 seconds and skip it on repeat launches;
show the static logo when reduced motion is on; ship animations as Lottie or SVG. These
apply when a loader or splash is built, and they must also respect the brief's "avoid
heavy animations" and the parent experience's size budget.

## Follow-up for the founder

Section 4.0 of the master prompt still carries the old wording, so
`docs/brief/04-design-and-branding.md` does too. Only the founder edits the brief
(`docs/decisions.md`, D-OPEN-4). The founder checklist item "Commission the final logo
and app icon" may already be done.
