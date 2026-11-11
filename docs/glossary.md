# Glossary

Use these words with exactly these meanings, in code, documents and conversation. If a
word seems to mean something else, or two words seem to mean the same thing, stop and
ask (brief section 3.3). The first table is the brief's "Key terms", unchanged in
meaning; the second adds words the brief uses throughout.

## Key terms (from the brief)

| Term                  | In code           | Meaning                                                                                                                                                                                             |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **School**            | `tenant`          | One school using Akoso. Every school's data is separated by `tenant_id` and RLS                                                                                                                     |
| **Group**             | `group`           | An owner's set of schools (branches) above individual schools                                                                                                                                       |
| **Session**           | `academicSession` | A school year, e.g. 2027/28, made up of three terms. A login is always a "login session"                                                                                                            |
| **Term**              | `term`            | One of the three parts of a session                                                                                                                                                                 |
| **Class**             | `class`           | A year group, e.g. JSS 2                                                                                                                                                                            |
| **Arm**               | `classArm`        | One stream of a class, e.g. JSS 2A                                                                                                                                                                  |
| **Family**            | `family`          | Siblings and the guardians who can see them in the app. Decides **who sees what**                                                                                                                   |
| **Billing account**   | `billingAccount`  | Whoever pays a bill: a guardian or a sponsor organisation. Decides **who is invoiced and receives receipts**. A family has one by default; split payers and sponsors have their own                 |
| **Dedicated account** | `virtualAccount`  | The collection-only bank account number created for one billing account (Paystack: DVA; Monnify: reserved account). "Family account" means the same. **To parents it is always the "fees account"** |
| **Platform fee**      | `platformFee`     | Akoso's own fee from a school for a term                                                                                                                                                            |
| **Portal fee**        | `portalFee`       | The platform fee when a school passes it to parents as a line on their invoices                                                                                                                     |
| **Deduction**         | `deduction`       | Akoso's share (default 10%) taken from each parent payment until the term's platform fee is covered                                                                                                 |
| **Backstop**          | `backstop`        | The direct debit from the school's own bank account that collects any shortfall                                                                                                                     |
| **Payout**            | `payout`          | Paystack's daily payment of collected fees to the school's bank account                                                                                                                             |
| **Score sheet**       | `scoreSheet`      | One subject's scores for one arm and term                                                                                                                                                           |
| **Snapshot**          | `resultSnapshot`  | The frozen, approved result that report cards are printed from                                                                                                                                      |
| **Golden files**      |                   | Real past broadsheets and report cards from pilot schools, anonymised, that the results engine must reproduce exactly                                                                               |
| **Kobo**              | `Kobo`            | All money is stored in integer kobo (₦1 = 100 kobo)                                                                                                                                                 |
| **Akoso team**        | `platformStaff`   | Akoso's own staff. Never confuse them with school staff                                                                                                                                             |
| **Support session**   | `supportSession`  | Akoso staff viewing a school's account with its permission                                                                                                                                          |
| **Brief**             |                   | The master prompt, split into section files under `docs/brief/`                                                                                                                                     |

## Other terms

| Term                     | In code               | Meaning                                                                                                               |
| ------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Level**                | `level`               | Nursery, Primary, JSS or SSS. Schemes and position settings are set per level                                         |
| **Guardian**             | `guardian`            | A parent or other adult responsible for a student. "Parent" in user-facing text                                       |
| **Fee payer**            |                       | The guardian marked as paying; by default the family's billing account                                                |
| **Sponsor**              | `sponsor`             | An organisation that pays fees: an employer, NGO, church, scholarship body or government scheme                       |
| **Enrolment**            | `enrollment`          | One record per student per term. (The table name follows the brief's spelling, `enrollments`; prose uses "enrolment") |
| **Assessment scheme**    | `assessmentScheme`    | The named components that total 100, e.g. CA1 10, CA2 10, Assignment 10, Exam 70                                      |
| **Component**            | `assessmentComponent` | One part of an assessment scheme, with a maximum and allowed decimal places                                           |
| **Grading scheme**       | `gradingScheme`       | Bands with a letter, minimum, maximum and remark                                                                      |
| **Position**             | `position`            | A student's rank in the arm or class, or in a subject. Ties use standard competition ranking: 1st, 2nd, 2nd, 4th      |
| **Broadsheet**           | `broadsheet`          | Students × subjects for a class, with totals, averages and positions                                                  |
| **Traits**               | `trait`               | Affective and psychomotor ratings on a 1–5 scale                                                                      |
| **Cumulative**           |                       | The third-term result that combines the session's term averages                                                       |
| **Rollover**             | `rollover`            | Moving a school to a new session: promotion, repeats, graduation, balances carried forward                            |
| **Fee item**             | `feeItem`             | Something a school charges for, with a scope, frequency and trigger                                                   |
| **Pass-through**         |                       | Money the school collects for someone else (e.g. WAEC fees), reported apart from school income                        |
| **Allocation**           | `paymentAllocation`   | The part of a payment applied to one invoice line                                                                     |
| **Credit**               | `familyCredit`        | Overpayment held for the family and applied to the next invoice                                                       |
| **Unmatched payment**    | `unmatchedPayment`    | A transfer that could not be matched to a billing account                                                             |
| **Write-off**            | `writeOff`            | Forgiving money already owed. Not a discount, which is planned before invoicing                                       |
| **Receipt number**       |                       | Per school, one unbroken sequence, e.g. `GA/2027-28/000412`                                                           |
| **Cash-up**              | `cashUp`              | A collector's daily reconciliation of cash, POS and teller payments                                                   |
| **Census date**          |                       | The date in a term when the active-student count is frozen for billing                                                |
| **Message credits**      | `creditLedger`        | A school's prepaid balance for WhatsApp, SMS and email                                                                |
| **Custody restriction**  | `custodyRestriction`  | A person marked "do not release to" and/or "no access to records"                                                     |
| **Authorised collector** | `authorisedCollector` | Someone allowed to pick up a child                                                                                    |
| **Outbox**               | `domainEvents`        | Events written in the same transaction as the change they describe, handled by the worker                             |
| **Module**               |                       | A feature area with one name across `core`, `db` and `schemas`, e.g. `fees`                                           |
| **Checkpoint**           |                       | A point in the build order where work stops until the founder approves                                                |
| **Cut-line**             |                       | The ranked list of items deferred first if a stage runs late (brief section 32.3)                                     |

## Product names

Akoso Pay, Akoso Reports, Akoso Parent, Akoso Admit, Akoso Staff, Akoso Prefect, Akoso
Insight, and Akoso Student (Part 2). They are defined once, in
`packages/core/src/config/brand.ts`. Never invent another.
