# Spike 02: Offline score entry and sync

- **Status:** Approved (founder, 11/11/2026). Sign-out rule: D-9
- **Module:** `offline-sync`, `results`, `apps/web` · **Brief:** sections 20, 11, 21, 28.3 · **Stage:** 1
- **Estimate:** 12 hours of agent time, plus a session on a real phone with you
- **Settles:** risk R13 (offline work lost on low-end Android). Informs R14 (the
  parent experience's 200 KB budget), because the service worker ships to parents too.

## Why a spike first

Offline score entry is on the brief's list of highest-risk areas: a lost score, or a
score silently overwritten, destroys a head teacher's trust. Browsers can evict offline
storage, Android can kill background work, and a dropped connection can cut a sync in
half. The spike tries all of that before the real score sheets are built on it.

## User story

As a teacher with no connection, I want to enter a class's scores and take the register
on my phone, and have every entry reach the school's records exactly once when I
reconnect, so that I never re-enter work or lose it.

## What the spike builds

All on branch `spike/02-offline-queue`, in clearly marked spike folders that are
removed when the real score sheets replace them.

1. **An installable app shell** with Serwist, cached by a service worker, so the spike
   pages open with no connection after one visit.
2. **A throwaway score sheet and register:** one class of 45 made-up students, three
   components (CA1, CA2, Exam) with maximums, and a 4-status register. Plain screens,
   enough to enter data; not the real design.
3. **A local queue in IndexedDB (Dexie).** Every edit is saved on the phone first, as an
   operation with a client-generated ID, the cell, the value and **the version of the
   cell it started from**. The spike asks the browser to make this storage persistent,
   so Android is less likely to evict it.
4. **An always-visible indicator:** online or offline, and the number of unsynced
   changes. "Online" means the last request to our server worked, not just what the
   browser reports, which is unreliable on Nigerian mobile networks.
5. **A sync endpoint** on the server. It takes queued operations in order and, for each:
   checks the cell is not on a locked (approved) sheet; validates the value against the
   component's maximum; then applies it. Each operation's client ID is recorded, so a
   repeat is recognised and not applied twice.
6. **The conflict rule from section 20.** Every score cell has a server version. If the
   version an offline edit started from is older than the server's, the **edit received
   later wins**, and the value it overwrote is kept on a conflict list for the head
   teacher. No phone's clock is used anywhere.
7. **Session expiry.** A switch makes the server answer "signed out". The queue stays on
   the phone, the teacher is asked to sign in again, and syncing resumes. Nothing is
   discarded except after a successful sync or a confirmed discard.

There is no real sign-in yet (that is the auth work), so the spike uses a fixed, fake
teacher and school. Server data goes through `withTenant()` into `spike_` tables, like
spike 01.

## How it is tested

**Automatically, with Playwright** (named in the brief's testing section), on a
mobile-sized, throttled browser:

- The section 20 acceptance test: go offline, enter **300 scores and a register of 40**,
  reconnect; every value reaches the server exactly once.
- The connection drops **halfway through a sync**, including after the server has
  applied an operation but before the phone hears back. Retrying must not apply it twice.
- Two phones edit the same cell offline; both sync; the later-received value wins and
  the other appears on the conflict list.
- An edit to a sheet that was locked while the phone was offline is refused on sync,
  kept on the phone, and shown to the teacher, not lost.
- The sign-in expires while offline; the queue survives sign-in again and syncs.
- The tab is closed and the phone restarted (simulated) with unsynced work; nothing is lost.

**By hand, on your real 2 GB Android phone**, the same acceptance test in airplane
mode, plus: Android's battery saver on, the browser closed from the recent-apps list,
and the phone rebooted, all with unsynced work. The result records the phone model,
Android version and browser version.

## Questions the spike answers

1. Does Serwist work with this version of Next.js (16.4) for the app shell and data?
2. Does IndexedDB keep queued work through tab close, browser kill, reboot and low
   storage on a 2 GB phone? Does the persistent-storage request make a difference?
3. Does the sync stay exactly-once when the connection drops at the worst moment?
4. Does the conflict rule ever lose a score?
5. How long does entering 45 scores take on the phone (the brief's target: under 10
   minutes), and a register of 40 (target: under 60 seconds)?
6. How much does the service worker and offline code add to what a parent's phone
   downloads (the parent budget is under 200 KB on first load)?

## What is kept

The queue, the sync protocol (operation IDs, cell versions, the conflict list) and the
test harness, rewritten into `offline-sync` with the real score sheets. The written result
goes in `docs/spikes/02-offline-queue.md`.

## Permissions

None change. The sync endpoint re-checks on the server every permission the real one
will need (here: the fake teacher may edit only their own class), because a phone's
queue cannot be trusted (brief section 28.3).

## Threat model (STRIDE)

| Threat                 | Example                                                               | Mitigation tested in the spike                                                              |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Spoofing               | A queued operation claims another teacher or school                   | The server takes teacher and school from the session, never from the operation              |
| Tampering              | An edited queue sends a score above the maximum, or for another class | Every operation re-validated on the server: maximum, class, locked state                    |
| Tampering              | A replayed operation applies twice                                    | Operation IDs recorded; repeats recognised                                                  |
| Repudiation            | A score changes with no record of who changed it                      | Each applied operation records the teacher and server time (the real audit log comes later) |
| Information disclosure | A shared or lost phone exposes a class's scores                       | Offline data scoped to the signed-in user; see open question 1 on sign-out                  |
| Denial of service      | A huge queue floods the server                                        | Batch size limit per sync request                                                           |
| Elevation of privilege | Offline code edits a locked sheet                                     | Refused on sync; kept on the phone and shown, not lost                                      |

## Acceptance criteria

- The 300-scores-and-register test passes automatically with zero loss and no
  duplicates, including with a sync cut in half.
- The same test passes by hand on a real 2 GB Android phone in airplane mode.
- No test, automatic or manual, loses a score or applies one twice.
- Every question above has a written answer with evidence.
- `pnpm check` and CI pass.

## Needs from you before code

1. **Approve this spec.**
2. **New dependencies.** All are in the brief's stack, but each is new to the repository:
   `serwist` and `@serwist/next` 9.5 (the service worker), `dexie` 4.4 (IndexedDB), and,
   for development only, `@playwright/test` (browser tests).
3. **A real 2 GB Android phone** for the final step, ideally a common low-end model in
   Nigeria (Tecno, Itel or Infinix), with **a USB cable and Developer options turned on**.
   Service workers only run on a secure address, and the simplest safe way to reach the
   app on this computer from the phone is Chrome's USB port forwarding. I will write the
   steps when we get there.

## Open questions

1. **Sign-out with unsynced work.** Section 20 says queued work is never discarded
   because a session expired, only after a sync or a confirmed discard. Section 28.3
   says offline data is cleared on logout. These meet when a teacher **chooses** to sign
   out with unsynced scores. **Recommendation:** an expired session never clears the
   queue; a deliberate sign-out with unsynced work first tries to sync, and if it cannot,
   warns "12 scores have not reached the school yet" and clears them only if the teacher
   confirms. This is a results and privacy question, so it is yours.
2. **Which phone.** Tell me the model you can get, so the result names it.
