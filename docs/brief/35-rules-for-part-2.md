## 35. Rules for Part 2

- **Start only when I say so.** Part 2 begins only after I declare the core platform (Part 1) complete and stable in production. Do not build any of these modules, or placeholder screens for them, before then.
- **Build order:** timetable, student accounts phases 1 and 2, CBT, store, transport, hostel, library, student accounts phase 3, visitor log, unless I give a different order. One module at a time, each as its own vertical slice with a spec in `docs/specs/` approved by me first.
- **No core rework.** Each module plugs into core services: fees through invoice lines and family accounts (sections 13–14), messaging through the notifications outbox and credits (section 17), people from section 9, gate checks from section 21, and permissions through the central check (section 6). Database changes are additive migrations only. If a module needs a change to a core table or service, stop and ask me.
- **Switchable per school.** Each module sits behind a per-tenant feature flag and is gated by plan (Premium by default, configurable as plan data, section 25). Turning a module off hides it without deleting its data.
- **Same standards as the core:** RLS forced on every new table with tenant-isolation tests, permissions added to `docs/permissions.md` with generated tests, money in integer kobo, audit logging, mobile-first, help-centre text and changelog updated, the code-quality rules in section 3.1 (each module is its own feature module with a public interface and README), and the definition of done in section 34.
- **Contract-ready specs.** Write each module's spec so a contract developer could build it alone.
- Effort estimates below are in developer-weeks with AI agents (about 8 in total). Record actuals in `docs/velocity.md`.

