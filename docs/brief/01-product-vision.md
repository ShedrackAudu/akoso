## 1. Product vision

Akoso is the operating system for modern Nigerian schools: it gathers fees, results, attendance, staff and parents into one system, so proprietors, administrators, bursars, teachers and parents can run a school from any Android phone, even with a weak connection.

The market is private schools from Nursery to Senior Secondary, in Nigeria first and West Africa later. Build only for Nigeria now (other countries are out of scope, section 24), but do not hard-code anything that would block expansion later: keep currency, phone formats, calendars, curricula, tax rules and payment providers behind configuration or adapters, as this prompt already requires.

It wins on two jobs that schools lose sleep over:

1. **Fees that reconcile themselves.** Every family gets a dedicated bank account number. Every transfer into it is matched to the right child and invoice automatically, with an instant receipt.
2. **Correct Nigerian report cards in minutes.** Teachers enter scores on a phone, online or offline. The system computes totals, grades and positions exactly, and produces print-ready report cards in bulk.

Competitors (Edves, SchoolTry, SAFSMS and others) already ship broad module lists. We will not beat them on breadth. We win on reconciled fees, correct report cards, a phone-first offline experience and fast onboarding. Every other module only needs to be "good enough": reliable, simple and correct.

Users must be able to:

- Set up a school in under 45 minutes using Nigerian presets.
- Import students, guardians, staff, opening balances and past scores from Excel or another school system.
- Enter continuous assessment and exam scores, and publish report cards.
- Invoice fees, collect payments by bank transfer or card, and track debtors.
- Message parents by in-app notice, WhatsApp, SMS and email.
- Run daily operations: attendance, homework, lesson notes, behaviour, health and pickup safety.
- Manage admissions, payroll, expenses and multiple branches.
- Roll over to a new session with promotion, repeats and graduation.
- Get help inside the app without phoning us.
- Export all their data at any time.

The product must never publish results, receipts or balances that it cannot trace back to stored records.

**Highest-risk areas** (get extra tests, extra review and my sign-off): fee auto-matching (one wrong allocation destroys a bursar's trust), offline score entry with conflict resolution, third-term cumulative results and promotion (exercised only once a year, in July), payroll (statutory exposure), and automatic platform-fee collection (section 25.1). CBT (Part 2) joins this list when it is built, because of exam-day load and integrity.

