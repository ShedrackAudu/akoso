# The app frame: layouts and navigation for the school app and the admin app

- **Status:** Approved (founder, 13/11/2026), with all four recommendations: parent pages under `/{school}/parent`; a bottom bar on phones; an initials monogram until a logo; the test dependency `@axe-core/playwright`
- **Module:** `packages/ui` (frame components), `apps/web` (school app layouts, `features/staff`, `features/parent`, `features/shared`), `apps/admin` (admin layout), `packages/core/src/identity` (one read: what the frame shows a person) · **Brief:** sections 4.0, 4.1, 18, 19, 30 · **Stage:** 2, first item (D-34)
- **Estimate:** 24 hours of agent time
- **New dependencies:**
  - **None for the app.** Menus, drawers, the sidebar and avatars come from the shadcn registry (`base-nova`), built on Base UI, which is already installed.
  - **One for tests (for your approval):** `@axe-core/playwright`, to check every frame page for accessibility problems automatically, as brief sections 4.1 and 30 ask.

## Why now

Stage 1 left every screen standing alone: no header, no navigation, and layouts that
don't match (some centred, some at the top, different widths). Stage 2 adds many screens
(setup, students, guardians, families, staff, imports). Building them on a shared frame
now is much cheaper than retrofitting it later (Stage 1 checkpoint, D-34).

## What it does

### 1. Two experiences in one school app (brief 4.0)

The school app at `app.{domain}` has a **staff experience** (Akoso Staff) and a **parent
experience** (Akoso Parent), each with its own frame.

- **Staff pages** stay where they are: `/{school}/...` (for example
  `/greenfield/settings/team`).
- **Parent pages** move under `/{school}/parent/...` (open question 1). Their code lives in
  `features/parent` and never loads staff code (brief 4.0; tech debt T5).
- **`/{school}`** sends each person to their experience: staff to the staff home, a
  parent-only person to `/{school}/parent`.
- **Someone who is both** (a teacher who is also a parent in that school) switches with
  **"Switch to parent view"** or **"Switch to staff view"** in their menu, without
  signing out. The choice is remembered on that device.
- Permissions are still checked on the server for every request. The frame only decides
  what to show.

### 2. The staff frame

**On a phone** (most teachers):

```
┌──────────────────────────────┐
│ [GA] Greenfield Academy ▾ (AO)│  top bar: school (switcher if several), my menu
├──────────────────────────────┤
│ People with access            │  page title
│                               │
│  … page content …             │
│                               │
├──────────────────────────────┤
│ [Home] [People] [Settings] [More] │  bottom bar: up to 4 + More (Phosphor icons over labels)
└──────────────────────────────┘
```

**On a computer or tablet** (proprietors, bursars and administrators often):

```
┌────────────────┬───────────────────────────────────────────┐
│ [GA] Greenfield │  People with access              (AO) ▾   │
│      Academy ▾  │───────────────────────────────────────────│
│                 │                                           │
│ [Home]          │   … page content, in a set width …        │
│ [People]        │                                           │
│ [Settings]      │                                           │
│   People with   │                                           │
│   access        │                                           │
│   Roles         │                                           │
│   Security log  │                                           │
│                 │                                           │
│ ─────────────── │                                           │
│ Akoso           │                                           │
└────────────────┴───────────────────────────────────────────┘
```

- **The sidebar** lists only what this person may open. It can be collapsed to icons. At
  the bottom, a small, quiet "Akoso" mark: the school comes first (brief 4.0).
- **The bottom bar** on phones shows up to 4 items for this person's roles, plus
  **More**, which opens a sheet with the rest (open question 2). Every item is at least
  44 px tall.
- **Icons:** Phosphor through the existing `Icon` wrapper. Outline normally, filled for
  the current item (brief 4.1).
- **"Settings"** groups the part B screens: people with access, roles, the security log.
- **Stage 2's screens** (Setup, Students, Guardians, Families, Staff, Import) each add
  one entry to the navigation list as they're built. Nothing appears before it works.
- **Product names** (Akoso Pay, Akoso Reports and so on) head their groups once those
  modules exist (Stages 3 and 4), exactly as brief 4.0 names them.

### 3. The parent frame

Phone-first and light: parents' phones are cheap and their data is costly (brief 18).

```
┌──────────────────────────────┐
│ [GA] Greenfield Academy  (NB) │
├──────────────────────────────┤
│ Good morning, Ngozi           │
│                               │
│  … home content (Stage 5) …   │
│                               │
├──────────────────────────────┤
│      [Home]      [More]       │
└──────────────────────────────┘
```

- **For now:** a top bar (school and my menu) and a bottom bar with **Home** and
  **More** (my account, sign-in and security, switch school, sign out).
- **Later stages fill it in:** Payments in Stage 4; Results in Stage 3; Messages and the
  child switcher in Stage 5.
- **No sidebar,** even on a computer: the content sits in a centred column.
- **Budget:** the parent frame may add at most **10 KB** to a parent page's first load,
  measured in the test. The parent pages are already over the 200 KB budget (R14, T14);
  this frame must not make it worse.

### 4. The admin frame

The admin app is used mostly on computers, and may be denser (brief 4.1).

- **On a computer:** a sidebar with Home, The team, Team security log, and My passkeys
  (each shown only with its permission), and a header with the member's name, roles and
  **Sign out**. The header says **Akoso Admin** in the brand's own colours: it isn't a
  school's space.
- **On a phone:** the same items behind a menu button.

### 5. The top bar's parts (school app)

- **School identity:** the school's name with a round monogram of its initials ("GA").
  Schools get a logo and brand colour in school setup, later in Stage 2. The monogram
  then gives way to the logo, and the brand colour reaches the frame through the scoped
  `--brand` variable, checked for contrast (brief 4.1). Preset tokens are never edited per
  school.
- **School switcher:** shown only to people in more than one school; it replaces the
  "Switch school" link.
- **My menu** (initials avatar):
  - name and role in this school
  - My account
  - Sign-in and security
  - Switch to parent or staff view, when both apply
  - Theme: light, dark, or the device's setting (brief 4.1)
  - Sign out
- **Offline indicator:** a slot in the top bar, used by the offline framework later in
  Stage 2.

### 6. Pages inside the frame

Every page uses the same building blocks, so pages line up:

- **`PageHeader`:** a title (Merriweather), an optional one-line description, and actions
  on the right.
- **`PageBody`:** three widths:
  - **narrow** (about 640 px), for forms such as My account
  - **standard** (about 1024 px), for most pages
  - **wide** (the full width), for tables and broadsheets later
- **Spacing:** 16 px side padding on phones, 24 px on larger screens.
- **`EmptyState`:** an icon, one calm sentence and an optional action, in the brand voice
  (brief 4.1). For example: "No school roles yet. Make one, such as Exams officer."

Every existing signed-in page moves into the frame: the school home, the settings pages,
My account, Sign-in and security, the school picker, and the admin pages. **Sign-in,
enrolment and recovery pages stay outside it,** as calm centred pages.

### 7. The school home, until real dashboards exist

Today's home page is a list of links. Until Stage 2's setup and Insight dashboards
arrive, the staff home becomes a short welcome:

- the school's name and the brand line "Know your school, every day."
- for proprietors and administrators, a few cards linking to what exists (people with
  access, roles, the security log)
- for teachers, "Your classes will appear here", until classes exist

### 8. Accessibility (brief 4.1, 30)

- **Navigation:** a "Skip to content" link first; landmarks (`header`, `nav`, `main`); the
  current page marked with `aria-current`; the sidebar and More sheet usable by keyboard,
  with visible focus.
- **Text and touch:** 16 px body text; 44 px tap targets; the phone's text-size setting
  respected.
- **Automated check:** an axe check (`@axe-core/playwright`) runs on each frame page, in
  light and dark themes, and fails the tests on any violation.

### 9. Where the navigation comes from

- **One list in code** (`features/shared/navigation.ts` in the school app, and its own in
  the admin app) describes each item: its label, icon, address, the permission that shows
  it, and which experience it belongs to.
- **The frame shows only the items whose permission the person holds in this school.**
  The same list drives the sidebar, the bottom bar and the More sheet, so they never
  disagree.
- **One server read**, `getFrame(ctx)`, gives the frame what it needs in a single call: the
  person's name, their schools, their roles here, whether they're both staff and parent,
  and their permissions.

## Data changes

None. The remembered staff-or-parent view is a cookie (`akoso_view`: `staff` or
`parent`), not school data. Logos and brand colours arrive with school setup.

## Permissions

None new. Navigation items reuse the existing permissions (for example
`identity.member.read` shows People with access).

## Edge cases

- **Someone with no active school:** the school picker, inside a minimal frame (top bar
  only), with a calm empty state.
- **A suspended or closed school:** the frame shows the school's status notice (the
  tenancy status rules) above the content.
- **A long school name:** shortened with an ellipsis in the top bar; the full name in the
  switcher and as a tooltip.
- **A teacher who is also a parent, in two schools:** both switchers work together: the
  school first, then the view.
- **JavaScript not loaded yet** on a slow phone: the frame's links work as plain links;
  menus wait until the page is ready (as `SafeForm` does).

## Threat model

The frame changes no data and adds no new access.

| Threat                                             | Mitigation                                                                                                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A hidden item still reachable                      | Every page and action still checks its permission on the server; the frame only hides links (tests confirm a 404 for a teacher opening a settings page directly) |
| The view cookie tampered with to reach staff pages | The cookie only picks which frame to show. Staff pages still need staff permissions on the server                                                                |
| Staff code downloaded to parents' phones           | Parent pages import only from `features/parent` and `features/shared`; a boundary rule (closing T5) enforces it                                                  |

## Acceptance criteria

1. **Navigation by role:**
   - a proprietor sees Settings and its three pages
   - a teacher sees neither, and gets 404 opening one directly
   - an Exams officer (custom role) sees People with access
   - the sidebar, the bottom bar and More always agree
2. **Experiences:**
   - a parent-only person lands on `/{school}/parent`
   - a teacher who is also a parent switches views without signing out, and the choice
     survives a reload
   - parent pages load no staff code (boundary rule)
3. **Phones:** at 375 px wide, the bottom bar shows; every target is at least 44 px; no
   page scrolls sideways.
4. **Computers:** at 1280 px, the sidebar shows, and collapses and expands.
5. **School switcher** for the parent in two schools; no switcher for people in one.
6. **Every existing page** uses `PageHeader` and `PageBody`, and the old placeholder
   links are gone.
7. **Accessibility:** axe finds no violations on the frame pages in either theme; "Skip
   to content" works by keyboard.
8. **Parent budget:** the parent frame adds at most 10 KB to first load, measured in an
   end-to-end test.
9. **Admin frame:** sidebar on a computer, menu on a phone, every admin page inside it.
10. **Screenshots** of each frame (phone and computer, light and dark) are attached to
    the pull request for your review.

## Out of scope

- School logos and brand colours (school setup, later in Stage 2): the frame has the slot.
- The child switcher, payments, results and messages for parents (Stages 3 to 5).
- Search, notifications and the offline indicator's behaviour (their own items).
- Fixing the parent budget overall (T13, T14): this item only must not make it worse.

## Open questions

1. **Parent pages under `/{school}/parent/...`.** I recommend this: one address per page,
   easy to share, and the parent code stays apart. The alternative is the same addresses
   showing different screens by role, which is harder to test and to link to.
2. **On phones, a bottom bar with up to 4 items plus More,** for both staff and parents. I
   recommend this: one-handed use, as brief 4.1 asks. The alternative is a menu button
   only, which hides everything one tap deeper.
3. **A monogram of the school's initials** until a logo is uploaded. I recommend this
   rather than the Akoso mark, so the school still comes first.
4. **The new test dependency,** `@axe-core/playwright`.
