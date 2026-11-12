# Akoso Founder Checklist

Things only you can do: accounts, contracts, legal and tax advice, school relationships, and decisions. Coding agents never do these themselves. They keep this list in the repo as `docs/founder-checklist.md`, and at every checkpoint they tell you which unticked items block the next stage.

Items are grouped by the stage that needs them, not by date. "Blocks" says what can't go live until the item is done; the build itself carries on using test modes and placeholders.

---

## Before or during Stage 1 (Foundations)

### Company and brand
- [ ] Register the company with CAC; get a TIN; open a corporate bank account. *Blocks: Paystack live mode, legal templates.*
- [ ] Register domains: `akoso.ng` (main), `getakoso.com`, `getakoso.ng`, `akoso.africa`. Check `akoso.com.ng`.
- [ ] Claim social handles (@akoso or @akosohq).
- [ ] Ask a Yoruba speaker to confirm the tone and connotations of *àkóso*.
- [ ] File the Akoso trademark at the Nigerian Trademarks Registry.
- [x] Approve the project documents, brief split, risks list, `AGENTS.md` and scaffold (Stage 1 checkpoint). *Done 11/11/2026.*

### Paystack (start early; approvals take time)

**Found in spike 04 (11/11/2026), do these first:**

- [ ] **Register the company with CAC now,** not later: Paystack refuses dedicated accounts and subaccounts to a Starter (individual) business, even in test mode. *Blocks: the rest of spike 04 and risk R1.*
- [ ] **Upgrade the Paystack account from Starter to Registered Business** once the CAC certificate is in hand.
- [ ] **Ask Paystack to enable dedicated accounts, subaccounts and split payments,** in test and live mode, then tell the agent so spike 04 can finish.
- [ ] **Turn off "pass transaction charges to customers"** in the Paystack dashboard settings. Test checkouts added Paystack's fee on top (₦45,000 became ₦45,786.81); the brief says parents never pay extra.
- [ ] **Roll the test secret key and the webhook signing secret** in the dashboard (they were pasted into a chat), and put the new ones in `apps/web/.env.local` when next needed.
- [ ] **Clear the test webhook URL** in the dashboard (it pointed at a temporary tunnel that is now closed).

- [ ] Open the Paystack business account and complete registered-business KYC and go-live. *Blocks: live dedicated accounts and fee collection.*
- [ ] Set the business category to **education/software**, not "Financial services" or "General services", so parents are not asked for their BVN.
- [ ] Ask Paystack to enable subaccounts, split payments and Direct Debit for Akoso.
- [ ] Request a higher dedicated-account limit (default 1,000), before onboarding the second school.
- [ ] Ask Paystack to show each school's name in account names (e.g. "GREENFIELD ACADEMY / NGOZI OKAFOR").
- [ ] Get Paystack's **written confirmation** of: *Blocks: automatic platform-fee collection (section 25.1).*
  - [ ] how quickly a changed split percentage applies to the next transfer into a dedicated account
  - [ ] whether a split group can make the school bear Paystack's fee on transfers into dedicated accounts
  - [ ] how refunds and chargebacks are divided between Akoso and the school on split payments
  - [ ] whether a zero platform charge is accepted on a card payment
  - [ ] that Akoso's percentage is calculated on the full payment, before Paystack's fee
- [ ] Ask about lower rates for the education category (repeat as volume grows).
- [ ] Open a Monnify account as the backup provider.

### Messaging
- [ ] Apply for a Termii sender ID on the DND (transactional) route. *Blocks: live SMS.*
- [ ] Complete Meta Business verification, register Akoso's WhatsApp Business number (Nigeria-registered), and get message templates approved. *Blocks: live WhatsApp.*
- [ ] Set up the Akoso sending email domain (agents configure SPF, DKIM and DMARC; you own the domain account).

### Hosting and tools
- [ ] **GitHub settings for the security scans** (CI/CD spec, Part A). I can make the first two with your OK:
  - [x] turn on Dependabot alerts (done 12/11/2026)
  - [x] add the Security jobs to the required checks in `protect-main` (done 12/11/2026)
  - [x] add the "code scanning results" rule to `protect-main` (done 12/11/2026: CodeQL and Semgrep OSS, high or higher)
  - [ ] install the **Renovate** GitHub App on the `akoso` repository only
  - [x] set up a commit-signing key (done 12/11/2026: an SSH signing key, unlocked through the Windows SSH agent)
  - [x] turn on "require signed commits" in `protect-main` (done 12/11/2026; rebase merging removed, since GitHub cannot sign it)
- [ ] **Register `akoso.ng`** and put its DNS on Cloudflare. Then forward `security@akoso.ng` to your inbox: `SECURITY.md` already gives that address. *Blocks: school addresses on staging, and Cloudflare in front of it.*
- [ ] Create accounts the build needs and own them yourself: hosting, Cloudflare, Sentry, PostHog, GitHub, Resend or SES, the AI provider. Give agents limited keys, never your own logins.

---

## Before Stage 3 (Results)

- [ ] Recruit 2–3 design-partner schools for the shadow pilot (a nursery/primary, a secondary, ideally a mixed school of 400–800 students), with a written agreement.
- [ ] Collect **golden files** from 5 schools, with permission: a past term's broadsheet and report cards, including ties, absent students, a mid-session transfer and at least one third-term example. Hand them over for anonymisation; never put raw files in the repo or shared chats. *Blocks: the results gate.*
- [ ] Answer agents' questions about each school's conventions (ranking by average or total, rounding, ties, cumulative averages).

---

## Before Stage 4 (Fees and payments)

- [ ] Have a lawyer review the **parent payment-account consent form** (section 29.1).
- [ ] Give pilot schools the consent form and make sure they collect it from families before their first invoice run.
- [ ] Agree each pilot school's fee schedule, instalment limits and bank account for settlement.

---

## Before the pilot readiness gate (end of Stage 5)

### Legal
- [ ] Have a Nigerian lawyer finalise: terms of service, data processing agreement, privacy notices for parents and staff, acceptable use policy, SLA, refund policy, agent agreement. *Blocks: launch.*
- [ ] Make sure the **school agreement** authorises: the 10% platform-fee deductions, the direct-debit backstop, recovery of refunds and chargebacks (indemnity and set-off), and the support-session rules.
- [ ] Get a short opinion from a **Nigerian fintech lawyer** that the split design keeps Akoso outside CBN payment licensing. *Blocks: live platform-fee collection.*

### Data protection
- [ ] Register Akoso with the NDPC (likely Ultra-High Level; confirm the tier).
- [ ] Appoint a DPO, or engage a licensed DPCO.
- [ ] Sign off the DPIA. *Blocks: pilot readiness gate.*

### Security
- [ ] Engage an independent penetration tester (budget permitting) and accept or reject any remaining risks in writing.

### People
- [ ] Recruit 5–8 full-pilot schools in one city cluster.
- [ ] Consider hiring a part-time support and onboarding associate.

---

## Before Stage 6 (Payroll)

- [ ] Have an **accountant** confirm: PAYE bands and rent relief, pension, NHF and NSITF rules, PAYE remittance by state, and the seeded tax tables. *Blocks: payroll go-live.*
- [ ] Line up two pilot schools for a payroll parallel run.

---

## Before Stage 7 (Billing, growth, mobile)

- [ ] Have the accountant advise on **VAT registration** (threshold disputed: ₦50m or ₦100m turnover), withholding tax, and Nigeria Revenue Service e-invoicing. *Blocks: live billing with VAT.*
- [ ] Validate pricing (₦400 / ₦700 / ₦1,000 per active student per term) with pilot schools; adjust in the platform admin.
- [ ] Recruit and approve agents; agree commission rates.
- [ ] Provide **design guidelines for the mobile app** before it grows beyond the foundation.
- [ ] Decide whether "Akoso Parent" gets a warmer name.
- [ ] Commission the final logo and app icon ("gather and tie" direction).

## Before the website (Phase A launch site)

- [ ] Provide **design guidelines for the website**.
- [ ] Collect written permission for any school name, logo, photo or quote you want on the site.
- [ ] Set up a demo-booking calendar.

---

## Before launch (Stages 8 and 9)

- [ ] Get professional indemnity and cyber insurance quotes (once revenue starts).
- [ ] Set up the on-call rota (likely you) and the public status page account.
- [ ] Approve the launch go/no-go (section 32.1).
- [ ] Prepare Google Play and Apple developer accounts for the future Expo app (not needed until the native app is ready).

---

## Before Akoso Student (Part 2 student accounts)

- [ ] Have a lawyer review the **student-account consent form** and the **student privacy notice** (master prompt, section 43). *Blocks: student accounts going live.*
- [ ] Sign off the updated DPIA for student accounts. *Blocks: student accounts going live.*
- [ ] Choose one or two secondary pilot schools and agree which class levels get student accounts.
- [ ] Decide whether Akoso Student is Premium-only or available on other plans, and set it in the platform admin.

---

## Recurring

- [ ] **Every checkpoint:** review and approve before agents continue; answer open questions in `docs/decisions.md`.
- [ ] **Every term:** check the termly restore drill result; review each school's termly business review; pay agent commissions.
- [ ] **Every quarter:** sign off the access review for Akoso staff and elevated school roles.
- [ ] **Every year, by 31 March:** file the NDPC annual compliance audit return through a licensed DPCO.
- [ ] **When anything fast-changing may have moved:** re-check WhatsApp pricing, the MTN overnight SMS window, NDPC fees and cookie rules, NERDC subject limits, Paystack fees and limits, and tax rates, and tell agents what changed.
