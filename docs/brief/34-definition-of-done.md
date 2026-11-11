## 34. Definition of done

A feature is done only when:

- [ ] Its spec in `docs/specs/` is approved and matches what was built.
- [ ] Typecheck, lint and all tests pass in CI, including tenant-isolation tests.
- [ ] Permissions are enforced on the server and covered by tests.
- [ ] Security checks in CI pass (SAST, dependency, secret and container scans), the relevant OWASP and ASVS items are met and recorded, and a threat model exists where section 28.2 requires one.
- [ ] It works on a 2 GB Android phone on a throttled 3G connection.
- [ ] Loading, empty, error and offline states are designed.
- [ ] It meets WCAG 2.2 AA and passes the automated accessibility checks (section 4.1).
- [ ] Dates and times follow the time-zone rules in section 3.1.
- [ ] Sensitive actions write to the audit log.
- [ ] Money is in integer kobo and results come from snapshots.
- [ ] The code follows section 3.1: module boundaries respected, no `any`, no lint or unused-code warnings, no circular dependencies, and the module README updated.
- [ ] Any shortcuts are recorded in `docs/tech-debt.md`.
- [ ] `ARCHITECTURE-ESSENTIALS.md`, `ARCHITECTURE.md` and `AGENTS.md` still match the code.
- [ ] `docs/progress.md` is updated, any decision you made is recorded in `docs/decisions.md`, and any new founder task is added to `docs/founder-checklist.md`.
- [ ] Help-centre text and the changelog are updated.
- [ ] User-facing text follows the Akoso voice (section 4.0).
- [ ] Estimated and actual hours are recorded in `docs/velocity.md`.
- [ ] It is deployed to staging behind a feature flag and I have reviewed it.

Never describe the platform as "fully compliant" or "error-free". Report honestly what was built, what was tested, and what still needs my decision.

---

# Part 2: Optional modules

