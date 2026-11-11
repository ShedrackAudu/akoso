# Spike 03 result: report-card PDFs with Gotenberg

- **Date:** 11/11/2026 · **Spec:** [stage-1-spike-03-report-card-pdfs](../specs/stage-1-spike-03-report-card-pdfs.md)
- **Branch:** `spike/03-report-card-pdfs`
- **Outcome:** comfortably within the brief's targets. 600 cards in **2 minutes** on
  mains power (under 4 on battery) against a 10-minute target; every card about **61 KB**
  against 300 KB. Risk R15 is closed. One design note: the brand fonts triple a card's size.

## In one paragraph

One realistic JSS end-of-term report card, with every element section 12 lists, was
rendered for a made-up school of 600 students through a pinned, locked-down Gotenberg.
Rendering is limited by CPU, at about 0.75 CPU-seconds per card, so the time scales
with the cores Gotenberg is given, not with how many requests are sent at once. Failures
injected on purpose, and Gotenberg restarted mid-batch, were retried with no card lost.
A repeat run of an unchanged school was served entirely from the cache in seconds.

## What was built

| Piece                                                                                       | Where                                               |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| PDF provider interface, Gotenberg 9 adapter, fake adapter                                   | `packages/providers/src/pdf/`                       |
| Gotenberg pinned to `9.4.0-chromium` and locked down                                        | `docker-compose.yml`                                |
| A runnable, bundled worker (tech debt T2)                                                   | `apps/worker/build.mjs`, `apps/worker/package.json` |
| Made-up school data shaped like a snapshot                                                  | `apps/worker/src/spike/report-cards/data.ts`        |
| Generated images: logo, stamp, signatures (SVG), stand-in photos (JPEG), QR code            | `.../assets.ts`                                     |
| The JSS end-of-term template (React, rendered to static HTML)                               | `.../template.tsx`, `.../render.tsx`                |
| Batch runner: limited concurrency, retries, input-hash cache, merge, zip, failure injection | `.../batch.tsx`, `.../zip.ts`                       |

Run it with `pnpm --filter @akoso/worker spike:report-cards -- --limit=600 --concurrency=4`
(Docker running). `--preview` writes a sample PDF and colour and greyscale images;
`--breakdown` measures what each part of a card costs.

## The card

A4 portrait, one page, filling about 90% of it: school logo, name, motto and colour
leading; student photo; a 14-subject table (CA1, CA2, Exam, total, grade, remark, subject
position); summary (total, average, position "31st out of 40", class average, highest
and lowest); affective and psychomotor traits; form-teacher and principal comments;
attendance; next-term date and fees; signatures and stamp; a verification QR code; and
the footer "Results prepared with Akoso". Every status is written in text, so nothing
depends on colour.

The grade bands, rankings and comments on it are **made up for measuring**. They encode
no school's convention; the real ones come from each school's schemes and the golden files.

## Answers

### 1. How long do 600 cards take? **2 minutes on mains power; under 4 on battery.**

Measured on a laptop with an Intel Core i7-10750H (12 logical CPUs, 32 GB), Docker
allowed 12 CPUs and 15.5 GB.

| Renders at once | 120 cards | Rate           | Wait per card (median / 95th percentile) |
| --------------- | --------- | -------------- | ---------------------------------------- |
| 1               | 31.5 s    | 3.8 per second | 257 / 283 ms                             |
| 2               | 23.3 s    | 5.2 per second | 378 / 441 ms                             |
| 4               | 22.5 s    | 5.3 per second | 734 / 884 ms                             |
| 8               | 23.8 s    | 5.1 per second | 1,369 / 2,335 ms                         |

**All 600 at 4 at once: 118.9 seconds**, on mains power. Later runs on battery took
222.5 and 225.1 seconds: the laptop slows its processor on battery. Either way, well
inside 10 minutes.

**What limits it:** while rendering, Gotenberg used 3.7 to 4 CPU cores and our worker
almost none. So a card costs about **0.75 CPU-seconds**, and more requests at once only
make each wait longer. Gotenberg already allows 6 conversions at a time. To go faster,
give it more cores or run more Gotenberg containers. A 2-core Gotenberg should do 600 in
about 4 minutes. For results week, with many schools at once, this is the number to plan
capacity with; the brief's k6 load test before the pilot gate should confirm it.

### 2. How big is a card? **60.7 to 61.9 KB for all 600; a fifth of the limit.**

| Variant of one card                              | PDF size                               |
| ------------------------------------------------ | -------------------------------------- |
| Full card                                        | 61.6 KB                                |
| Without the photo                                | 57.7 KB                                |
| Without logo, stamp and signatures               | 52.1 KB                                |
| Without the QR code                              | 61.6 KB (vector, costs almost nothing) |
| Photo at JPEG quality 85 instead of 72           | 64.2 KB                                |
| **With the brand fonts (Figtree, Merriweather)** | **206.6 KB**                           |

About 50 KB of every card is the fonts Chromium embeds (Noto Sans and Noto Serif, which
ship with Gotenberg). **The brand fonts more than triple the size**, still under 300 KB but
with little room left. The files used were the web app's _variable_ fonts (Figtree's Latin
file 20 KB, Merriweather's 98 KB), which contain every weight. Static font files with only
the weights a card uses should cost far less; a decision for the real templates. The
stand-in photo is only 4.2 KB; a real passport photo at this size is probably 10 to 20 KB,
which still leaves room.

### 3. Merging and zipping? **Both fast.**

A class of 40 merged into one PDF in **0.1 seconds** (2.4 MB: the merged file repeats
each card's fonts rather than sharing them). A zip of all 600 took **0.4 seconds** (36 MB).

### 4. Does it survive failures? **Yes.**

| Test, 200 cards each                             | Result                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| One in every 25 render attempts fails on purpose | 8 failed, all 8 retried and succeeded; **0 cards lost**                                                   |
| Gotenberg restarted after card 100               | 4 renders caught by the restart were retried and succeeded; **0 cards lost**; Gotenberg came back healthy |

Retries are for timeouts, refused connections, 5xx and 429 answers, up to 3 times with
backoff. A 4xx answer, meaning the request itself is wrong, is not retried.

### 5. How should the worker run? **Bundled with esbuild (tech debt T2).**

Node 24 runs TypeScript itself, but refused our packages (`ERR_MODULE_NOT_FOUND`): they
import each other without file extensions. `apps/worker/build.mjs` now bundles the worker
with esbuild (already in the repository), compiling our own packages in and leaving
outside libraries (React, sharp, qrcode) to load normally. `--watch` rebuilds on change.

### 6. Is it readable in black and white? **Yes: the founder judged it readable (11/11/2026).**

A greyscale render and the sample PDF were sent for review, and the founder judged the
card readable in black and white. All statuses are text, and borders separate every
part, so nothing should depend on colour.

## Other findings

1. **Gotenberg is now version 9.** Version 9 renamed the PDF tools: merging moved from
   `/forms/pdfengines/merge` to **`/forms/pdf/merge`**. Pinned to `9.4.0-chromium`, the
   image without LibreOffice (1.5 GB instead of 2.2 GB).
2. **The lock-down works.** With JavaScript off and Chromium barred from public and
   private addresses, a test page's outside image was blocked, and logged as blocked.
   Chromium's own update check was blocked too.
3. **The cache only works if inputs are stable.** The first cache test rendered all 600
   again: the stand-in photos were random noise, regenerated each run. Real photos are
   stored once at upload and never change; the spike now keeps them too, and a repeat run
   took 6.8 seconds with nothing rendered. Changing the template version re-rendered every
   card, as it must.
4. **A screen screenshot misleads about print.** At 1,240 pixels wide the card looked like
   one page while the PDF was two. Previews now use the printable width and print styles.
5. **A 2.4 MB merged class PDF** repeats each card's fonts. Fine for printing; worth
   knowing before sending whole classes by email.

## What happens next

- **Keep:** the PDF provider and Gotenberg adapter, the locked-down Gotenberg settings,
  the bundled worker set-up, the batch runner's shape (limited concurrency, retries,
  input-hash cache) and the measurements.
- **Throw away:** the made-up school, images and the minimal zip writer (the real worker
  should use a maintained zip library, chosen in its spec), all under `spike` folders.
- **Decide later:** brand fonts on report cards, as static subset files or not at all;
  per-school limits on renders at once in results week.

## Effort

One working session against an estimate of 10 hours. Agent time was not measured to the
hour, so `docs/velocity.md` records it as one session.
