## 8. School setup and academic structure

Build an onboarding wizard that a non-technical proprietor can finish in under 45 minutes.

Steps:

1. School profile: name, slug, logo, colours, motto, address, state, LGA, phone, email, school type (nursery, primary, secondary, combined), time zone (default Africa/Lagos), principal and head-teacher signatures.
2. Session and terms: session name (e.g. 2027/2028), three terms with start, mid-term break and end dates, next-term resumption date. Never hard-code a state calendar: published Lagos dates differ between sources, other states differ, and schools on international curricula run their own term dates. Each school enters and confirms its own dates. The school calendar also records non-school days (public holidays, mid-term breaks, unplanned closures): attendance uses it to count "days school opened", and absence alerts, fee reminders and other scheduled messages are not sent on those days.
3. Levels and classes: Nursery (Pre-nursery, Nursery 1–2, Reception/KG), Primary 1–6, JSS 1–3, SSS 1–3; class arms (A, B or named, e.g. Gold, Diamond); form teacher per arm.
4. Subjects: presets for both the pre-2025 NERDC lists and the 2025 revised curriculum. Each class arm records which **curriculum version** it follows, because the new curriculum is phased in by cohort from September 2025 (starting at Primary 1, Primary 4, JSS1 and SS1). SSS tracks (Science, Humanities, Business) and trade subjects are supported. Schools can add, rename or remove subjects. For arms on the 2025 curriculum, warn (do not block) when the number of subjects falls outside the revised limits, stored as data: Primary 1–3: 9–10; Primary 4–6: 10–12; JSS: 12–14; SSS: 8–9.
5. Assessment schemes per level: named components (e.g. CA1 10, CA2 10, Assignment 10, Exam 70) that must total 100; weights configurable (40/60, 30/70, etc.). Each component also sets how many decimal places a score may have (default whole numbers; e.g. allow 0.5 for schools that give half marks).
6. Grading schemes per level: bands with letter, minimum, maximum and remark. Presets: WAEC 9-point (A1–F9) and A–F.
7. Position settings per level: class position on/off, subject position on/off (so a level can show positions, hide them, or show subject positions only), rank within arm or across all arms of a class; ranking basis: by average or by total score (many schools rank by total).
8. Traits: affective and psychomotor lists with a 1–5 scale (presets provided).
9. Nursery rubric mode: skill areas with developmental ratings (e.g. Emerging, Developing, Secure) and narrative comments, without positions.
10. Fee schedule (section 13) and bank account for settlement (section 14).
11. Staff invitations with role, classes and subjects.

All subjects, schemes and traits are stored as data, versioned, and never hard-coded.

Acceptance: a new school is configured in under 45 minutes; Primary 4 can run the new curriculum list while Primary 6 runs the old one in the same session; the assessment and grading schemes of 5 real pilot schools are configurable without code.

