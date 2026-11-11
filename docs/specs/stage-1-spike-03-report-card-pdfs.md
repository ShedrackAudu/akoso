# Spike 03: Report-card PDFs with Gotenberg

- **Status:** Approved (founder, 11/11/2026), with the dependencies in D-11
- **Module:** `results`, `apps/worker`, `packages/providers/pdf` · **Brief:** sections 12, 11, 28.3, 31 · **Stage:** 1
- **Estimate:** 10 hours of agent time, plus a short visual review by you
- **Settles:** risk R15 (600 report cards in under 10 minutes, each under 300 KB) and tech
  debt T2 (how the worker runs). Informs T10 (pinning the Gotenberg image).

## Why a spike first

Report cards are one of the brief's two core promises, and results week is when the
platform is busiest: many schools publish in the same days (`docs/ARCHITECTURE.md`,
section 14). If a realistic card cannot be rendered fast enough, or comes out too big for a
parent's data plan or a WhatsApp attachment, the whole PDF approach needs rethinking
before the real results engine is built.

## User story

As a school administrator in results week, I want a whole school's report cards rendered
in minutes, each small enough to send to a parent's phone, so that I can publish on the
day the head teacher approves them.

## What the spike builds

All on branch `spike/03-report-card-pdfs`, in folders named `spike`.

1. **One realistic JSS end-of-term template,** as the brief describes: school logo, name,
   motto and colour leading the page; student photo; a subject table for 14 subjects
   (CA1, CA2, Exam, total, grade, remark, subject position); summary (total, average,
   "5th out of 42", class average, highest, lowest); affective and psychomotor traits;
   form-teacher and principal comments; attendance; next-term resumption date and fees;
   signatures and a stamp; a **verification QR code**; and the footer "Results prepared
   with Akoso". A4 portrait, readable when printed in black and white.
2. **Made-up input shaped like an approved snapshot:** one fake school, 14 classes of
   about 43 students, so 600 cards. Fake photos (generated, never of real children),
   a fake logo, signatures and stamp.
3. **A renderer in the worker** that turns one snapshot into the template's HTML and sends
   it to Gotenberg, with the images as separate files so they are not repeated inline.
4. **A batch runner** that renders all 600 with a set number of Gotenberg requests at a
   time, retries a failed render, and never lets one failure stop the batch; then merges
   each class into one PDF and builds a zip, as section 12 asks.
5. **A cache keyed by a hash of each card's inputs,** so asking again for an unchanged
   card does not render it again.
6. **The PDF provider interface** in `packages/providers/pdf`: the real Gotenberg adapter
   and the fake one for tests.

## Questions the spike answers

1. How long do 600 cards take, and how does it change with 1, 2, 4 and 8 renders at a
   time? What limits it (the worker, Gotenberg's CPU, its memory)?
2. How big is each PDF, and what makes up the size (fonts, photo, logo, QR code)? What
   does it take to stay under 300 KB?
3. Does a merged class PDF and a zip of 600 come out at a sensible size and time?
4. Does Gotenberg cope with failures: a render that times out, the container restarting
   mid-batch? Does the batch carry on and report what failed?
5. How should the worker run in development and in production (tech debt T2): Node 24's
   own TypeScript support, or bundling with `esbuild`, which the repository already has?
6. Is the card readable in black and white? **This one is yours:** I will print or
   show a greyscale version for you to judge.

Times measured on this laptop are not production. The result will record the laptop's
CPU and memory, and what Gotenberg was allowed, so the numbers can be scaled.

## What is kept

The PDF provider interface and Gotenberg adapter, the batch runner's shape (limited
concurrency, retries, progress, input-hash cache), the worker run set-up, and the
measurements. The template itself is a first draft; the real templates come with the
results engine and your design guidelines.

## Not in this spike

Real results computation, golden files, the other templates (nursery, primary, SSS,
third term, mid-term), label overrides, layout variants, transcripts, testimonials,
publishing, the fee gate, storage in object storage, signed URLs and pg-boss jobs. The
batch runner is a script, not a queued job; pg-boss comes with the real worker.

## Permissions

None change. The spike renders made-up data with no sign-in.

## Threat model (STRIDE)

| Threat                 | Example                                                                             | Mitigation in the spike                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tampering              | A forged or edited PDF passed off as genuine                                        | QR code carries an opaque verification token; the real check against the snapshot hash (section 28.3) comes with publishing |
| Information disclosure | Student data in HTML reaching Gotenberg over a network                              | Gotenberg is reached only on the private network (localhost here); it never fetches anything from outside                   |
| Information disclosure | A template pulls in an outside URL (fonts, images) and leaks that a card was opened | Every asset is sent with the HTML; Gotenberg's outbound requests are blocked                                                |
| Elevation of privilege | Malicious text in a comment injects HTML or script into the card                    | All text is escaped when the HTML is built; JavaScript is disabled in the renderer                                          |
| Denial of service      | One school's batch starves every other school in results week                       | Limited renders at a time per batch; measured, so per-school limits can be set                                              |

## Acceptance criteria

- 600 cards render without loss, with a recorded time, at each concurrency level.
- Every PDF's size is recorded; the target is under 300 KB, and if it is missed the
  result says by how much and why.
- A forced failure mid-batch is retried or reported, and the rest of the batch completes.
- Rendering the same card again with the same input is served from the cache.
- Every question above has a written answer with evidence, in `docs/spikes/03-report-card-pdfs.md`.
- `pnpm check` and CI pass.

## Needs from you before code

1. **Approve this spec.**
2. **New runtime dependencies** (yours under section 3.3):
   - `react` and `react-dom` in the worker, to build the template's HTML with
     `renderToStaticMarkup`, the same component model as the web app. They are already in
     the web app, so this adds no new library to the project, only to the worker.
   - `qrcode` 1.5 (the npm package), for the verification QR code. Long-established; it
     brings three small packages of its own (`pngjs`, `dijkstrajs`, and `yargs` for its
     command-line tool, which we would not use).
   - `sharp`, to re-encode photos small, which the brief also asks for uploads (section 28).
     It already appears in `pnpm-workspace.yaml`'s list of packages allowed to run
     install scripts, because Next.js uses it.
3. **Pinning Gotenberg:** I will pin the image to an exact 8.x version (tech debt T10),
   recorded in the result.
4. **Later, a few minutes of your time** to judge the card in black and white.

## Open questions

- None that block the spike. The card's look is a first draft for measuring, not a design
  decision; the real layout follows your design guidelines and the golden files.
