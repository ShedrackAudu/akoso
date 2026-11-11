## 37. Computer-based tests (CBT)

Treat CBT as a high-risk area: exam-day load and integrity get extra tests and my review.

- **Question bank** per subject and class level: single-choice, multiple-choice and true/false questions, with optional images and simple maths notation; tags by topic and difficulty; Excel import of questions; question versioning, so editing a question never changes a test already taken.
- **Test set-up:** duration, start and end window, number of questions drawn from the bank, randomised question and option order per candidate, marks per question, pass mark, attempt limit, and whether candidates see their score at the end.
- **Candidates:** students (class tests and exams) or applicants (entrance exams linked to admissions, section 22).
- **Exam delivery:**
  - Candidates log in with a one-time exam code.
  - Each candidate can have only one active session.
  - The countdown is controlled by the server.
  - Every answer is autosaved, locally first and then to the server.
  - A candidate can resume on another computer after a crash or disconnection, with the time already used counted.
  - Tests auto-submit when time ends.
- **School labs:** the exam must survive unreliable internet in a school computer lab on the local network. Answers queue locally and sync when the connection returns. Write an ADR on whether a local relay server in the lab is needed, and ask me before building one.
- **Invigilator dashboard:** who has started, progress, time remaining, connection status; extend time for a candidate with a reason (audited). Tab switching and focus loss are logged and flagged, never auto-penalised.
- **Marking and results:** objective questions marked automatically; item analysis (percentage correct per question); push scores into a chosen score-sheet component (e.g. CA2) as a draft that the teacher reviews before submitting (section 11); entrance-exam scores go to the applicant record.
- Tables: `question_banks`, `questions`, `question_versions`, `cbt_tests`, `cbt_sessions`, `cbt_answers`, `cbt_results`.
- Effort: 1.5. Depends on score sheets (section 11) and admissions (section 22).

Acceptance: a k6 load test with 300 concurrent candidates shows no lost answers; killing a candidate's browser mid-test and resuming loses at most the answer being typed; scores reach the score sheet only after teacher review.

