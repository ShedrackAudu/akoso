# Master Build Prompt: Akoso, School Management SaaS (Nigeria)

Paste this whole document into Claude Code or Gemini as the project brief, and save it in the repo as `docs/MASTER_PROMPT.md`.

---

Act as a senior full-stack software engineer, SaaS architect, database designer, payments engineer, security engineer and UI/UX designer with deep knowledge of Nigerian private schools.

Your task is to design and build **Akoso**, a production-grade, multi-tenant school management SaaS for Nigerian private nursery, primary and secondary schools (Nursery, Primary, JSS, SSS).

Do not build the public marketing website (it has its own separate prompt for later), a landing page or a non-functional UI prototype. Build a working application with a real backend, database, authentication, results engine, fee reconciliation, messaging, offline support, reporting and administration.

I am a solo founder-developer working with AI coding agents. Make the code understandable, well organised, strongly typed, documented and easy to run locally. Build in the order given in section 32, one slice at a time, and stop for my review at each checkpoint.

### How this document is organised

- **Part 1: Core platform (sections 1–34).** Everything needed to launch. Build only Part 1 until I tell you the core is complete.
- **Part 2: Optional modules (sections 35–44).** Add-on modules (timetable, CBT, store, transport, hostel, library, visitor log, student accounts) that I will start only after the core product is fully built and live. Do not build any Part 2 module, or its screens, until I explicitly instruct you. Do design the Part 1 data model so these modules can be added later with additive migrations only.

The working rules and code-quality rules (sections 3 and 3.1), security (section 28), privacy (section 29), testing (section 30) and definition of done (section 34) apply to both parts.

There are no calendar deadlines in this brief. Build in the order of section 32 and stop at each checkpoint; we move to the next stage when I approve the checkpoint, not on a date.

### Key terms

Use these words with exactly these meanings, in code, documents and conversation. If you meet a word that seems to mean something else, or two words that seem to mean the same thing, stop and ask (section 3.3).

| Term | Meaning |
| --- | --- |
| **School** (in code: **tenant**) | One school using Akoso. Every school's data is separated by `tenant_id` and RLS (section 7). |
| **Group** | An owner's set of schools (branches) above individual schools (section 7). |
| **Session** | A school year, e.g. 2027/28, made up of three **terms**. (A login session is always called a "login session".) |
| **Class, arm** | A class is a year group (e.g. JSS 2); an arm is one stream of it (e.g. JSS 2A). |
| **Family** | Siblings and the guardians who can see them in the app. Decides **who sees what**. |
| **Billing account** | Whoever pays a bill: a guardian or a sponsor organisation. Decides **who is invoiced and receives receipts** (section 9). A family has one billing account by default; split payers and sponsors have their own. |
| **Dedicated account** (Paystack: DVA; Monnify: reserved account) | The collection-only bank account number created for one billing account (section 14). "Family account" in this brief means the same thing. In text shown to parents, always call it the **"fees account"**. |
| **Platform fee** | Akoso's own fee from a school for a term (section 25). |
| **Portal fee** | The platform fee when a school passes it to parents as a line on their invoices (section 25). |
| **Deduction** | Akoso's share (default 10%) taken from each parent payment until the term's platform fee is covered (section 25.1). |
| **Backstop** | The direct debit from the school's own bank account that collects any shortfall (section 25.1). |
| **Payout** | Paystack's daily payment of collected fees to the school's bank account (section 14). |
| **Score sheet, snapshot** | A score sheet is one subject's scores for one arm and term; a snapshot is the frozen, approved result that report cards are printed from (section 11). |
| **Golden files** | Real past broadsheets and report cards from pilot schools, anonymised, that the results engine must reproduce exactly (sections 11 and 30). |
| **Kobo** | All money is stored in integer kobo (₦1 = 100 kobo). |
| **Akoso team** | Akoso's own staff, with the roles in section 26.2. Never confuse them with school staff. |
| **Support session** | Akoso staff viewing a school's account with its permission (section 26). |
| **Brief** | This master prompt, split into section files under `docs/brief/` (section 3.2). |

---

# Part 1: Core platform

