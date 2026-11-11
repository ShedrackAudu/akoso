## 43. Student accounts (Akoso Student)

Student accounts let secondary-school students see their own school life in the Akoso app and do their schoolwork there. Treat this as a high-risk area: it holds children's data and gives children their own login. It needs a threat model (section 28.2), an updated DPIA (section 29) and my review before each phase is released.

Build it in three phases, each with its own spec approved by me and its own checkpoint. Phase 3 items appear only when the module they depend on is switched on.

**Who can have an account**

- Only students in class levels the school switches on: JSS1 to SS3 by default, set per level in school settings. Never Nursery or Primary; younger children stay under their parents' accounts.
- An account is created only after the school records the guardian's consent for that child in the consent ledger (section 29), using a student-account consent form the school collects on paper or as a signed upload, in the same way as the payment-account consent (section 29.1). Consent is never collected through the app. Draft the form and a plain-language student privacy notice (written for 10 to 17-year-olds) in `docs/legal-templates/`, marked "for legal review".
- If a guardian withdraws consent or the student leaves the school, the account is disabled the same day; its data then follows the retention settings (section 29).
- Students use the same Akoso app as everyone else: the PWA at `app.akoso.ng` (section 4.0) and, once it is built, the Expo app (section 5), with the same sign-in and the same features in both. After sign-in they see only the student experience. A student account cannot hold any other role.
- The module follows the Part 2 rules (section 35): switchable per school and gated by plan.

**Sign-in (the one core change this module makes)**

- Students do not need a phone number or email address. They sign in with the school code, their admission number and a PIN of at least 6 digits, or by scanning the QR code on their student ID card and entering the PIN.
- The school prints a sign-in slip per student with the school code, admission number, a first-time PIN and the QR code; the form teacher hands the slips out. The first-time PIN must be changed at first sign-in.
- **Forgotten PIN:** the form teacher or a school admin can reset it, and so can a linked parent from the parent app ("Reset my child's PIN"), so a forgotten PIN at home does not wait for school. The other side is notified (the parent when staff reset it; the form teacher's list shows parent resets), and every reset is audit-logged.
- Lock the account after repeated wrong PINs (rate-limited per admission number and per device); the form teacher can unlock it.
- **Shared computers:** schools often use one computer lab. The student sign-in screen has a "This is a shared computer" box, ticked by default; the school can also register lab computers so the box is always ticked there. On a shared computer the session ends after a short idle time (default 10 minutes, configurable), nothing is remembered, and closing the browser signs the student out. On the student's own device, the session lasts longer (set by the school, default 30 days) and the PIN is asked again after the app has been closed for a while.
- **Shared family phones:** a student may sign in on a parent's phone. The parent's and the student's sessions are kept separate; switching from the student back to the parent account requires the parent to sign in again (OTP, or the phone's own lock if the parent has turned that on), so a child can never open the parent's view.
- This sign-in method changes the core authentication set-up (section 6), and I approve that change as part of this module. Write an ADR first. Add it as a separate sign-in method with its own session rules, available to both the PWA and the Expo app through the same API (section 5.1); do not change how parents or staff sign in.

**What students never see or do**

- Fees, balances, invoices, payments, receipts or anything about family finances. If the fee gate (section 12) withholds online results, the student sees "Your results are not available yet. Please ask your parent or the school office", with no mention of fees.
- Other students' scores or data, rankings or league tables. A student sees only their own report card, exactly as the parent sees it.
- Restricted pastoral notes, health records, custody restrictions, early-warning flags (section 23) or staff comments meant for staff only.
- Messages between students, private chats with staff, social feeds, public leaderboards, an open AI chat, advertising, or third-party analytics and trackers. The student experience collects only what its features need.

**Phase 1: student portal (read-only)**

- **Home:** today's classes (from the timetable once section 36 is built), homework due soon and the latest announcements.
- **My calendar:** terms, holidays, exam dates and events from the school calendar (section 8).
- **My attendance:** the student's own attendance record (section 21).
- **My results:** released results and report cards only, available at the same moment as for parents (section 12), with a simple progress chart across terms.
- **Announcements screen:** staff can choose students as an audience by class arm, level or the whole school (section 17). Every announcement for the student appears on an Announcements screen, newest first, so students see it whenever they next sign in, whether or not they were signed in when it was sent:
  - Unread announcements are marked, the menu shows an unread count, and the latest unread ones appear on the home screen after sign-in.
  - Staff can pin an important announcement (e.g. an exam timetable change or a closure) so it stays at the top until a date they set.
  - Each announcement can have an expiry date, after which it leaves the screen.
  - Staff see a read count (e.g. "142 of 180 students have seen this"), not a list of who has not read it.
  - Push notifications are an optional extra for students who have installed the app on their own device and allowed notifications. No SMS or WhatsApp credits are spent on students.
- **SS3 reminders:** WAEC, NECO and JAMB registration and exam dates, entered by the school as calendar events, with reminders.
- **Digital student ID card:** name, class, admission number and a photo (only with photo consent, section 29), and a signed QR code that the gate, library and CBT can scan. The QR carries an opaque, revocable token, never personal data.
- **Parents' view:** in the parent app, a "What my child sees" page and the student's last sign-in time.

**Phase 2: learning**

- **Homework (section 19) for students:** a list with due dates and attachments, downloadable for offline reading (section 20). Students submit photos or files before the deadline (file rules from section 28: allowed types, size limits, images re-encoded); late submissions are marked late. Teachers mark each submission and add a short comment and an optional score. A teacher can push homework scores into a score-sheet component as a draft to review before submitting (section 11), as with CBT. Submissions a parent makes for a child without a student account work as before.
- **Learning materials:** teachers share notes, past questions and links per subject and class arm, which students can download for offline reading. Storage limits per school come from plan data (section 25).
- **"Ask about this homework":** a question thread attached to one homework item, between the student and the subject teacher. It is not a chat:
  - It is always visible to the form teacher, the head teacher and the safeguarding lead, and it stays with the homework.
  - Text and images only. Staff can close a thread or hide a message, with a reason that is recorded.
  - A "Report" button sends a thread to the safeguarding lead.
  - The school can switch threads off.
- This is not a full LMS (section 24): no video classes, discussion forums or quizzes outside CBT.

**Phase 3: connected modules (each only when that module is switched on)**

- **CBT (section 37):** practice tests and mock exams the school opens to students, taken from the student account instead of a one-time exam code, with JAMB-style timing for SS3. Practice scores never go into score sheets. Real class tests and exams keep the one-time exam code and invigilation.
- **Library (section 41):** the student's loans, due dates and overdue notices; books are issued by scanning the student ID QR code.
- **Timetable (section 36):** the full weekly class timetable.
- **Clubs and prefect duties:** clubs and societies with members and meeting times, set up by staff; prefects see the duty rosters staff give them. Students cannot record anything about other students.

**Audit and safeguarding:** audit-log account creation, disabling, PIN resets, consent changes, hidden messages and reports. The safeguarding lead can see all homework threads for the school.

- Tables: `student_accounts`, `student_id_tokens`, `shared_devices`, `announcement_reads` (reusing the core `announcements` table), `homework_submissions`, `homework_feedback`, `homework_threads`, `homework_thread_messages`, `learning_materials`, `clubs`, `club_members`, `prefect_duties`. Reuse the consent ledger (section 29) for student-account consent; do not create a separate consent table.
- Effort: 2.5 (phase 1: 1.0, phase 2: 1.0, phase 3: 0.5). Depends on people (section 9), results (section 12), communication (section 17), homework (section 19), attendance (section 21) and, for phase 3, sections 36, 37 and 41.

Acceptance: automated tests prove that a student account cannot reach any fee, payment or restricted data, any other student's data, or anything before it is released; results appear for the student at the same moment as for the parent; an idle student session on a shared computer ends on time; a student who was signed out when an announcement was sent sees it, marked unread, at next sign-in; switching from a student session to the parent account on the same phone requires the parent to sign in again; withdrawing consent disables the account within one minute; a 2 MB photo submission completes within 60 seconds on a 2 GB Android phone on a throttled 3G connection; every homework thread is visible to the safeguarding lead.

