## 26. Platform administration

Create a separate admin area for our team, on its own subdomain, with explicit server-side role checks and MFA.

Include:

- Tenant (school and group) management: create, configure, suspend, reactivate, close.
- A resettable demo tenant with realistic fake data for sales demos.
- **Public demo (for the website):** a read-only copy of the demo tenant that anyone can open from the website without signing up, with a visible "Demo" banner and a switch between proprietor, bursar, teacher and parent views. It resets every night and never contains real data.
- **Leads:** a leads table for website enquiries and demo bookings, with a simple pipeline (new → contacted → demo booked → won → lost), an owner, notes, the source (referral code and campaign tags) and the next follow-up date. New leads notify me by WhatsApp or email.
- **Sign-up approvals:** "Start your free term" requests from the website wait in a queue for my approval before a school is created; approval starts the onboarding checklist.
- **Agent applications:** agent sign-ups from the website, approved by me before an agent gets a referral code.
- **Plan information for the website:** a public, read-only endpoint (or a build-time export) of current plan names, prices and minimums, so the website never drifts from the app.
- **Platform-fee ledger (section 25.1):** for each school and term, the amount due, collected, remaining and carried forward, the current split setting, mandate status and any backstop debits.
- Onboarding tracker per school: setup steps done, import status, first invoice run, first report-card run, parent activation.
- Assisted migration tools (section 10).
- **Support sessions (impersonation):** an Akoso staff member sees a school's account as its admin sees it, only with the school's permission, for a limited time, and with a full record:
  - **Request:** support requests access from an open support ticket, giving a reason and a duration. Every session is linked to a ticket.
  - **Consent:** the school chooses in its settings between "ask every time" (the proprietor or admin taps Allow or Decline on an in-app request naming the ticket, reason and duration) and "standing permission while a ticket is open" (support may start at once, and the school is notified when it does).
  - **Time limit:** default 30 minutes, maximum 2 hours; the session ends automatically, and extending it needs the school's permission again. A banner on the support person's screen shows the school's name and the time left. The proprietor can end any session at any moment.
  - **View only by default:** support can look but not change anything. Changes need the school to tick "allow changes" for that session.
  - **Never allowed in a support session,** even with permission: moving or refunding money, changing fee, bank or platform-fee settings, exporting personal data, and viewing health records, restricted notes or custody restrictions. The school does these itself, with support guiding them.
  - **Record:** who opened the session, when, why, the linked ticket, every page viewed and every change made, and when it ended, in both Akoso's and the school's audit logs. When it ends, the school gets a short summary (e.g. "Viewed: Payments, the Okafor family statement. No changes made. Ended 10:42.").
  - **"Who accessed our school" page:** a list of every past support session in the school's settings, with each summary.
- **Account health alerts** that prompt a check-in call: report cards not published by week 12 of a term, fee invoices not issued by resumption, parent activation under 50%.
- Subscription overview, invoices, credit balances and agent commissions.
- Job queue status, worker health, failed jobs with retry, PDF render times.
- Payment health: webhook failures, reconciliation mismatches, unmatched-payment ageing, DVA usage vs provider limit.
- Messaging health: delivery rates by channel and network, credit consumption.
- Custom domain and certificate status per school; feature flags per tenant.
- Plan, price and tax-table configuration.
- Audit log viewer and security events.
- Support tickets with the tenant context attached.

### 26.1 In-app onboarding, help and support

- Role-based onboarding checklists (proprietor, admin, bursar, teacher, parent) that track progress inside the app.
- Contextual help links on every main screen, pointing to help-centre articles.
- A "contact support" button that opens a ticket or a WhatsApp chat with the school, user, role and current screen attached.
- Ticket priorities: P1 = the school cannot publish results or take payments (target first response within 1 hour); others by business hours (7 AM–7 PM weekdays, extended during resumption and results weeks). Track median first-response time.
- In-app links to a results-week checklist and a resumption-week fees checklist.

Acceptance: a new bursar completes the first invoice run without a support call.

### 26.2 Akoso team roles and access

Akoso's own staff follow least privilege, like school staff. **Akoso staff do not see children's records by default:** access to a school's data happens only through a support session the school has agreed to (the impersonation rules in section 26), which is time-limited and logged in both Akoso's and the school's audit logs.

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Owner** | Everything, including team roles, pricing, platform-fee settings, emergency switches and closing schools | — |
| **Support** | View a school's setup, settings and tickets; open a consented support session | Change money records or fee settings; export personal data |
| **Onboarding / migration** | Set up a school and run imports during its onboarding | Access the school after onboarding ends, unless the Owner grants it again for a set period |
| **Finance** | Akoso's platform-fee ledger, invoices, direct-debit mandates, credits and agent commissions | See children's records or school-fee details beyond totals |
| **Sales** | Leads, demos and sign-up requests | See any school's data |
| **Ops / engineering** | System health, job queues, provider status and logs (which hold no personal data) | See school records; change data outside a recorded break-glass session (section 28.3) |

- Add these roles to `docs/permissions.md` and generate tests from them, like school roles. One person can hold several roles.
- **Account security:** passkeys or security keys (not SMS codes) for the Owner and any role that touches money; short idle timeouts; re-authentication before risky actions (changing prices or platform-fee settings, emergency switches, closing a school, granting roles). While the Owner works alone, the riskiest changes also need a typed confirmation and take effect after a short delay (e.g. 10 minutes) that can be cancelled, as a substitute for two-person approval.
- Every Akoso staff action is audit-logged and appears in the quarterly access review (section 28).
- **Offboarding checklist:** when someone leaves, their access is removed the same day, their sessions and keys are revoked, and the change is logged.

### 26.3 Founder's dashboard

One screen for running Akoso as a business, built from data the platform already holds:

- Schools by stage: lead → free term → paying → grace period → left, with numbers moving between stages each term.
- Active students in total and per school.
- This term's platform fees: due, collected, remaining, carried forward, and how much came from the 10% deductions versus direct-debit backstop debits.
- Total school fees processed through Akoso, and Paystack fees as a share of them.
- Messaging revenue against its cost (margin per channel).
- Parent activation across schools.
- Support: open tickets, median first response, P1 incidents.
- Schools at risk of leaving (the account health alerts in section 26) and schools in grace period.
- Agent commissions owed and paid.
- Cost per active student (section 31).

### 26.4 Agent portal

Approved agents (section 26) sign in to a simple portal of their own, at the app address with an agent role, showing only:

- their referral link and QR code;
- their leads and referred schools, and each one's stage;
- commissions earned, pending and paid, with monthly statements;
- marketing materials to share (approved flyers, short videos, WhatsApp text).

Agents never see any school's data beyond a referred school's name, stage and the amounts their commission is based on. Commission payouts are recorded in the portal (paid manually or by bank transfer at first).

### 26.5 Emergency switches

Platform-wide controls for the Owner, each requiring re-authentication, logged, and shown on the status page where schools are affected:

- **Maintenance mode** for the whole platform or one school, with a message to users.
- **Pause WhatsApp or SMS sending** (all schools or one), e.g. if costs spike or a provider misbehaves; critical messages fall back to the remaining channels.
- **Pause platform-fee split changes** (section 25.1), holding the current split settings until resumed.
- **Switch payment collection from Paystack to Monnify** (section 14), following the payment-provider outage runbook (section 31).

### 26.6 Announcements to schools

- "What's new" notes shown in the app after a release, written in the brand voice.
- Planned-maintenance notices, sent ahead of time to proprietors and admins.
- Service messages to proprietors (e.g. a change to the terms or pricing, with the required notice).
- Targeting by plan, school or role. These are separate from the public status page.

### 26.7 When a school leaves

A guided exit process, so leaving is orderly and nothing is lost or kept longer than allowed:

1. The school gives notice; Akoso offers the full data export (section 23) straight away and again before closing.
2. The final term's platform fee is settled through the deductions or the direct-debit backstop; any credit owed to the school is refunded from Akoso's account.
3. Parents are told the school's payment accounts will close; dedicated accounts stop accepting payments on the closing date.
4. The school's access becomes read-only for a set period (e.g. 90 days), then closes.
5. After the retention period in the school's agreement, the school's data is deleted (or pseudonymised where records must be kept), and the school receives a written confirmation of deletion.

Every step is logged, and the platform admin shows each leaving school's progress.

