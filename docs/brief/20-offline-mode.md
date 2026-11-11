## 20. Offline mode

Teachers must be able to work through a school day with no connection.

- A service worker caches the app shell and the teacher's current class lists and score sheets.
- Score entry, attendance and trait ratings save to IndexedDB first, as queued operations with client-generated IDs.
- An always-visible indicator shows online/offline state and the number of unsynced changes.
- On reconnect, operations sync in order; the server validates each one.
- Conflict rule: the server keeps a version number for every score cell. An offline edit records the version it started from. On sync, if the server's version has moved on, the change the server received later wins, and the overwritten value is kept and shown on a conflict review screen for the head teacher. Never use a phone's clock to decide which edit wins, and never silently lose a score.
- If the teacher's login expires while offline, keep the queued work on the phone, ask them to sign in again when back online, then sync. Queued work is never discarded because a session expired; it is cleared only after a successful sync or an explicit, confirmed discard.
- Approved (locked) sheets cannot be changed offline.

Acceptance: in airplane mode, a teacher enters 300 scores and a register, reconnects, and everything syncs with zero loss and no duplicates.

