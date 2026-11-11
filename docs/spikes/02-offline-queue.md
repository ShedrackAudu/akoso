# Spike 02 result: offline score entry and sync

- **Date:** 11/11/2026 · **Spec:** [stage-1-spike-02-offline-queue](../specs/stage-1-spike-02-offline-queue.md)
- **Branch:** `spike/02-offline-queue`
- **Outcome:** the design works, in a desktop browser emulating a phone and on a real
  2 GB Android phone (Redmi A2+). Risk R13 is closed for everything tested; one gap
  remains: Chrome would not protect the app's storage. One new problem found: the parent
  download budget is already exceeded (risk R14).

## In one paragraph

Scores and a register entered with no connection were saved on the phone first and
reached the school exactly once on reconnecting, including when the connection dropped
after the school had saved a batch but before the phone heard back. When two phones
changed the same score, the later-received change won and the replaced value was kept
for the head teacher. Changes to a sheet approved meanwhile, and changes made while the
sign-in expired, were kept on the phone and shown, never dropped. Unsent work survived
the browser being killed and restarted. No test lost a score or applied one twice.

## What was built

| Piece                                                             | Where                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Shared request and response shapes (Zod)                          | `packages/schemas/src/offline-sync.ts`                                   |
| Server: claim each change's ID, check, apply, record conflicts    | `packages/core/src/offline-sync/spike/`                                  |
| Spike tables, with forced row-level security, in their own schema | `packages/db/src/spike/offline-schema.sql` (`pnpm spike:offline:setup`)  |
| API routes: sheet, sync, and spike-only switches                  | `apps/web/app/api/spike/offline/`                                        |
| Phone: IndexedDB queue (Dexie), sync engine, screens              | `apps/web/features/staff/offline-spike/`                                 |
| Service worker and manifest (Serwist, Turbopack mode)             | `apps/web/app/sw.ts`, `app/serwist/`, `app/manifest.ts`, `app/~offline/` |
| Conflict list for the head teacher                                | `/spike/offline/conflicts`                                               |
| 9 browser tests (Playwright, Pixel 5 screen)                      | `apps/web/e2e/`, run with `pnpm test:e2e`                                |
| CI job running them                                               | `.github/workflows/ci.yml` ("End-to-end tests")                          |

The screen is at `/spike/offline`: a fake class of 45 (JSS 2A), three components (CA1 /20,
CA2 /20, Exam /60) and a tap-to-mark register. It is a test bench, not the real design.

## The tests (all 9 pass, twice in a row)

| Test                                   | What it proves                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Section 20 acceptance**              | Offline: the page reopens from the service worker; 300 score entries and a register of 40 are made; 175 changes wait on the phone. Reconnected on a throttled ~3G link, every final value reaches the school, and each cell's version equals the number of distinct changes applied to it |
| Sync cut off after the school saved it | The school applied a batch, the reply was lost, the phone resent it; every cell ended at version 1. The repeats were recognised by their IDs and ignored                                                                                                                                  |
| Two phones, same score                 | Later-received value kept (version 2); the replaced value appears on the conflict list                                                                                                                                                                                                    |
| Sheet approved while offline           | Both changes refused on sync, kept on the phone, shown with "approved while you were offline"; nothing saved                                                                                                                                                                              |
| Sign-in expired while offline          | "Your sign-in has expired. 3 changes are kept on this phone"; after signing in again, all 3 arrive                                                                                                                                                                                        |
| Browser killed, phone restarted        | 4 unsent changes survived closing and relaunching the browser profile, then synced                                                                                                                                                                                                        |
| Sign-out with unsent changes (D-9)     | Warns "3 changes have not reached the school yet"; "Stay signed in" keeps them; discards only after "Sign out and discard"                                                                                                                                                                |
| Sign-out with everything sent          | Signs out straight away                                                                                                                                                                                                                                                                   |
| A page never opened before, offline    | Shows Akoso's offline page, not a browser error                                                                                                                                                                                                                                           |

## Answers

### 1. Does Serwist work with Next.js 16.4? **Yes, in its Turbopack mode.**

`@serwist/turbopack` builds the service worker through a route handler; the build
precaches 25 files. Two things to know:

- **It reloads the page on every reconnect by default** (`reloadOnOnline`). For a
  teacher halfway through typing a score, that throws the entry away. It is switched off
  in `apps/web/app/layout.tsx`, with a comment saying why. Six tests failed until it was.
- Its dependency `@swc/core` wants an install script that only re-checks a native binary
  already installed. It is listed as **not allowed** to run scripts (`pnpm-workspace.yaml`).

### 2. Does queued work survive? **Yes, on a real phone too, but the storage is not protected.**

Unsent changes survived closing the tab and killing and relaunching the browser with the
same profile. What a desktop cannot show: Android evicting storage when the phone is full,
battery saver, the browser being swiped away from recent apps, and whether the
persistent-storage request is granted on a real phone.

On the Redmi A2+, 90 unsent changes survived Chrome being swiped away from recent apps
and a full reboot. Chrome did **not** grant storage protection, even after the page was
bookmarked; see the phone session below.

### 3. Does sync stay exactly-once when the connection drops at the worst moment? **Yes.**

Every change carries an ID made on the phone. The server claims the ID before applying
the change, in the same transaction, so a resend is recognised and answered with the
first result. The test cut the connection after the school saved a batch; the resend
changed nothing.

### 4. Does the conflict rule ever lose a score? **No.**

The change received later wins, and the value it replaced is written to an append-only
conflict list shown to the head teacher. A phone's own earlier edits never count as
conflicts with itself (the server compares phone IDs). No phone clock is used anywhere.

### 5. How long do 45 scores and a register of 40 take on a phone? **Well within target.**

On the Redmi A2+, entered by hand: **45 scores in 153 seconds** (target: under 10
minutes) and **a register of 40 in 46 seconds** (target: under 60 seconds). Times come
from a recorder reading the phone every 3 seconds, so each is accurate to a few seconds.
One person, one session: a guide, not a study of teachers.

### 6. How much does this add to a parent's download? **Too much, and the base is already over budget.**

Measured on a first visit with an empty cache:

| Page                        | Transferred (compressed) | Then the service worker downloads  |
| --------------------------- | ------------------------ | ---------------------------------- |
| `/` (the plain placeholder) | **297 KiB**              | 25 files, **986 KiB** uncompressed |
| `/spike/offline`            | 368 KiB                  | the same 986 KiB                   |

The brief's parent budget is under 200 KB on first load. The placeholder home page is
already over it with no features, most likely from the framework and three web fonts
(Figtree, Merriweather and the preset's Geist Mono). And the precache sends every
visitor, parents included, the staff screens' code in the background. **R14 is now
likely, not just possible.** Suggested fixes, for a decision when the parent screens
are built: precache only the parent shell for parents and staff screens after a staff
sign-in; drop Geist Mono unless something needs it; load only the font weights used; and
add a bundle-size check to CI.

## Other findings

1. **Drizzle returns timestamps from raw queries as text, not dates.** The conflict page
   crashed on it; the tests caught it. Real code should either use the query builder's
   typed columns or format times in SQL, as the spike now does.
2. **The import-boundary check caught a real reach-in**: the sync code imported
   `config/env.ts` instead of the config module's public interface. Fixed by importing
   through `config/index.ts`.
3. **Claiming an operation ID first needs `UPDATE` on the record of operations,** to
   write its outcome after applying. Fine for the real table; the alternative (insert
   once, at the end) needs more care with two phones sending the same change at once.
4. **Merging repeated edits of one cell is best-effort.** If a second edit arrives while
   the first is being sent, both are sent and both applied (version 2). That is correct,
   not a repeat, but it means "one change per cell" cannot be relied on. On GitHub's
   runner the acceptance test saw 180 waiting changes instead of 175 for this reason,
   so the test now checks for at least one per cell. The screen also stopped trying to
   send on every edit while it already knows it is offline; that removed most of the
   effect and saves a phone pointless requests.
5. **Playwright's page-level request interception does not see requests that go through
   a service worker.** Tests that intercept must do it on the browser context.
6. **The spike-only `switches` route has no sign-in.** It only flips the spike's own
   tables, but it must never reach a deployed environment (recorded as tech debt T12).

## The phone session (11/11/2026)

**Phone:** Xiaomi Redmi A2+ (model 23028RNCAG), Android 13 Go edition, 1.8 GB usable
memory (the 2 GB model; Chrome reports 2 GB), Chrome 157.0.8103.46, 6.9 GB storage free.
Xiaomi's Android Go home screen (`com.gogo.launcher`).

**Set-up:** the production build on the development computer, reached from the phone's
`localhost:3200` through `adb reverse` over USB, so the app counted as a secure address.
Because that link runs over the cable, **airplane mode alone did not cut the phone off**:
"offline" meant airplane mode on _and_ the USB link removed. State was read from the
phone's Chrome through its debugging connection, touching only the Akoso tab.

| Test                                | Result                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page opens with no connection       | **Pass.** Reloaded in airplane mode from the service worker                                                                                                                                   |
| 45 CA1 scores, offline              | **Pass.** 153 seconds                                                                                                                                                                         |
| Register, offline                   | **Pass.** 40 marks in 46 seconds (all 45 marked in total)                                                                                                                                     |
| Changes kept on the phone           | **Pass.** 90 waiting, none refused                                                                                                                                                            |
| Chrome swiped away from recent apps | **Pass.** 90 still waiting when reopened offline                                                                                                                                              |
| Battery saver on                    | **Pass, as reported.** The founder turned it on; it read off after the reboot, so this was not confirmed from the phone                                                                       |
| Phone rebooted                      | **Pass.** Confirmed by uptime; 90 still waiting, page reopened offline                                                                                                                        |
| Reconnect                           | **Pass.** Everything sent within about 6 seconds of the link returning, by the app's own retry, while airplane mode was still on                                                              |
| Exactly once, on the server         | **Pass.** 90 changes applied, each once: 45 score cells and 45 register entries, all at version 1; no repeats, no conflicts; register dated 11/11/2026 (Lagos)                                |
| Storage protection                  | **Not granted.** `navigator.storage.persist()` answered _false_ on first visit and again after bookmarking. 3.4 MB used of a 10 GB allowance                                                  |
| Install to home screen              | **Not offered.** Chrome reported the app installable (no errors, manifest read), but its menu and share sheet had no install or "Add to home screen" item, online or offline. Cause not found |

**What the storage result means.** Without protection, Android may clear the app's data
if the phone runs critically low on space, which is common on cheap phones full of
WhatsApp media. Nothing came close here (3.4 MB used, 6.9 GB free), and the test did not
fill the phone to provoke it. Mitigations, for the real offline work: tell the teacher
plainly how many changes are unsent (done); sync at the first chance (done); and retry
installing from a real HTTPS address on staging, since the missing install option may
come from the local test address or the Go launcher.

## What happens next

- **Keep:** the shapes in `packages/schemas/src/offline-sync.ts`, the claim-then-apply
  protocol, the conflict list, the sync engine's structure, the service worker set-up
  (with reload-on-reconnect off) and the browser test harness.
- **Throw away:** the fake class, the spike tables and schema, the switches route and the
  test-bench screens, all under `spike` folders.

## Effort

One working session against an estimate of 12 hours, plus the phone session still to come.
