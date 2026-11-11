## 10. Data import and migration

Schools arrive with messy Excel files, exports from other systems and paper records. Make import a polished feature, not a script.

Implement:

- Downloadable templates for students, guardians, staff, opening fee balances and previous-term scores.
- Upload of .xlsx or .csv with a column-mapping screen.
- Saved column mappings for exports from common Nigerian school systems (Edves, SAFSMS and others), built as real export files arrive from schools.
- Phone number normalisation, name cleanup, date parsing and class matching.
- Duplicate detection (same name and date of birth; same guardian phone → siblings).
- A dry run that shows every error by row and field before anything is saved.
- Import of only the valid rows on confirmation, as one batch.
- One-click rollback of a whole import batch within 7 days.
- An import history with who imported what and when.
- An assisted-migration mode for our team (via the platform admin, section 26): collect data, dry run, school sign-off, go live, with the school's sign-off recorded.

Previous-term scores must import correctly, because third-term cumulative results depend on them.

Acceptance: a 600-student school with 5% bad rows imports cleanly in under one day when we do it, and in under two days when the school does it alone, with every error explained. Target: one week from signed contract to first invoice run.

