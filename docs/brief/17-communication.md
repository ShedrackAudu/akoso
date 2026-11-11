## 17. Communication

Build one messaging service with channel adapters and a single `notifications` outbox table.

**Channels, in cost order**

1. In-app and web push (free): default for everything.
2. WhatsApp Cloud API: approved **utility** templates for receipts, report-card PDFs, fee reminders and absence alerts. Never send marketing templates. Capture WhatsApp opt-in per guardian. Use a Nigeria-registered WhatsApp Business Account, so authentication (OTP) messages are not billed at the much higher international authentication rate. From 1 October 2026 Meta bills per delivered message, including service messages, so WhatsApp is for rich content, not the cheap default.
3. SMS via Termii: transactional messages (OTP, receipts, alerts) on the **DND route** with a registered sender ID. Promotional broadcasts on the generic route are queued outside the 8 PM–8 AM window for MTN numbers.
4. Email via Resend or SES for receipts, report cards and staff invitations.

Critical messages (receipt, results ready) fall back from WhatsApp to SMS if undelivered within 10 minutes.

**Who messages come from**

Record the decision in an ADR. The default for launch:

- **WhatsApp:** one Akoso WhatsApp Business number, with the school's name at the start of every template ("Greenfield Academy: We received ₦45,000 for Chidi…"). Per-school numbers, through Meta's embedded sign-up for technology providers, can be added later as a Premium option.
- **SMS:** one registered Akoso sender ID at first, with the school's name in the message. A school may apply for its own sender ID; each needs its own Termii approval, so it is an onboarding step with a waiting time, tracked in the onboarding checklist.
- **Email:** sent from an Akoso domain with SPF, DKIM and DMARC set up, the school's name as the display name and the school's email as reply-to.

**Features**

- Message templates with variables, in English plus optional Pidgin, Yoruba, Hausa and Igbo versions. Seed templates follow the Akoso voice (section 4.0): calm and confident, plain numbers, no exclamation marks, the child's name in parent messages, and signed with the school's name.
- Broadcasts to the whole school, a level, a class, debtors or a custom list, with a **cost preview** before sending.
- Announcements and a school events calendar visible in the parent app, with event RSVP and digital permission slips (e.g. for excursions): parents give or refuse consent in the app, the school sees who has and hasn't answered, and an optional event fee is invoiced on acceptance.
- Newsletters (rich text with images) published in the app.
- Parent–teacher meeting scheduling: teachers publish slots, parents book them, teachers see their schedule.
- Two-way messages between parents and form teachers, with school-set hours and admin visibility.
- Delivery status per message, retries with backoff, and a delivery report.
- **Message credits:** a prepaid credit ledger per school; credits are debited on delivery; low-balance alerts; usage reports. Credit prices are configurable per channel with a margin over provider cost (planning assumption: about 10–15 notifications per family per term). Never absorb messaging costs into the subscription. Login and security codes (OTPs) are the exception: by default Akoso bears their cost as a platform cost, tracked per school and kept low by the limits in section 28.4; this is a platform setting I can change.
- Quiet hours and frequency caps per guardian.

