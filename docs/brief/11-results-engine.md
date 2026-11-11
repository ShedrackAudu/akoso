## 11. Results engine

This is the product's core. A wrong position on a report card destroys a school's trust. Build the computation as pure functions in `packages/domain/results` and test them against real report cards (golden files).

**Score sheets**

- One sheet per class arm, subject and term; one row per student; one column per assessment component.
- Mobile-first grid that works offline (section 20); a class of 45 can be entered on a phone in under 10 minutes.
- Inline validation against each component's maximum.
- Mark a student as **absent** or **exempt** for a component or a subject; blank cells block submission.
- Status workflow: Not started → Draft → Submitted → Approved (locked) → Published.
- Only the head teacher can unlock an approved sheet. Every change after approval is audited with reason, and triggers recomputation for the whole arm.
- Completion tracker for the head teacher: which teachers have submitted which sheets.

**Computation rules**

1. Subject total = sum of component scores, each capped at its maximum and limited to the component's allowed decimal places (section 8).
2. Grade and remark = the band in the level's grading scheme that contains the total.
3. Overall total = sum of subject totals for subjects the student takes (exempt subjects excluded).
4. Average = overall total ÷ number of subjects taken, rounded to 2 decimal places (half up).
5. Class position ranks students in the arm (or across the class, if configured) by the level's ranking basis, average or total score (section 8), highest first. Ties use standard competition ranking: "1st, 2nd, 2nd, 4th". Ranking by total is only fair when students take the same number of subjects; warn the school when they don't.
6. Subject position ranks by subject total, same tie rule.
7. Class statistics: number in class, class average, highest and lowest average; per subject: average, highest, lowest.
8. Third-term cumulative: configurable as the mean of available term averages or a weighted formula; students who joined mid-session use only the terms they attended.
9. Promotion status from configurable rules (e.g. cumulative average ≥ 50 and passes in English and Mathematics), with manual override and reason.
10. Positions are hidden wherever the level's settings turn them off (common in nursery and lower primary).

Computation must be deterministic: the same inputs always produce the same outputs.

**Approval and snapshots**

When a head teacher approves a class, write an immutable snapshot of totals, grades, positions, statistics and the scheme versions used. Published report cards always render from the snapshot. Later edits to schemes never change a published result.

**Comments, traits and attendance**

- Form teachers rate affective and psychomotor traits with tap-to-rate.
- Form-teacher and principal comments per student, with a comment bank that suggests comments by average band.
- AI comment drafts: generate draft comments for a whole class (in under 30 seconds) from scores, trend versus last term, traits and attendance. Send **no names or identifiers** to the AI provider: use a placeholder such as `{first_name}` with the right pronoun, and fill in the name in Akoso after the draft returns. Never send admission numbers, contacts or health data. Each school can switch AI drafts off. Label drafts as AI-generated until edited. A human must edit or approve every draft before publishing.
- Attendance summary per term (days present / days school opened), filled from the attendance register (section 21) or entered manually.

**Mid-term progress reports**

- Optional per level: a mid-term report showing the components entered so far (e.g. CA1 and CA2), attendance to date and a short comment, from its own approved snapshot.
- No overall positions unless the school turns them on. It never replaces or changes the end-of-term result.

**Broadsheets**

- Class broadsheet (students × subjects with totals, averages and positions) as A3 landscape PDF and Excel.
- Totals on the broadsheet must match the report cards exactly.

