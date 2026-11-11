## 14. Payments and automatic reconciliation

This is the second core differentiator. Every naira must trace from the bank to the payment, the allocation and the invoice.

**Setup**

- Onboard each school as a Paystack **subaccount** linked to its own bank account. Verify that the account name matches the school's registered name before activating.
- Money always settles from the payment provider directly to the school's account. The platform never holds school funds.
- Put every provider behind a `PaymentProvider` interface. Implement Paystack first and Monnify as a backup with the same interface.
- Paystack dedicated accounts require our registered business to have completed go-live and KYC (section 32.2). Until then, build and test against Paystack test mode and the development payment adapter (section 25).
- Register Akoso's Paystack business in the education or software category, not "Financial services" or "General services", so Paystack does not require each parent's BVN before a dedicated account is issued. Create dedicated accounts only with the parent's consent, and that consent always comes through the school, never through the app: the school collects it (e.g. a line on its enrolment or fee form that parents sign) and confirms it per family in Akoso, by import or on the family record, and the consent ledger (section 29) records who confirmed it and when. Accounts are then created automatically for every confirmed family before the first invoice run.
- A dedicated account is not a bank account the parent owns: it is a collection-only account number issued through Paystack's partner bank under Akoso's business, which the parent cannot withdraw from or use for anything else; everything paid in settles to the school. The account name shown in the parent's banking app is the business name followed by the payer's name (e.g. "AKOSO / NGOZI OKAFOR"); ask Paystack to show each school's name instead (e.g. "GREENFIELD ACADEMY / NGOZI OKAFOR"), so parents can see they are paying the right school. Explain this in the parent help guide and the school's consent wording.

**Dedicated bank accounts**

- Create one dedicated account per **billing account** (section 9), linked to the school's subaccount. Most families have one billing account, so most families have one dedicated account. Allow per-student accounts as a school setting.
- Show the account number and bank on invoices, the parent app, reminders and report cards.
- Track the provider's DVA limit per environment (Paystack's default is 1,000 accounts until increased on review) and alert before it is reached. Ask Paystack for a higher limit before onboarding the second school (section 32.2).

**Payment flows**

1. A parent transfers any amount to the family's account from any bank app or USSD.
2. The provider sends a webhook. Verify the signature, store the raw event in a `payment_events` inbox (unique on provider reference), return HTTP 200 immediately.
3. The worker matches the account to its billing account (section 9) and allocates the amount only to invoice lines that billing account is responsible for: oldest unpaid invoice first; within an invoice, mandatory lines before optional lines; across siblings by the school's rule (default: oldest invoice first). A bursar can override the allocation within a family, e.g. when a parent says the money is for one particular child.
4. Issue a numbered receipt and notify the parent within 60 seconds. Receipts are headed "{School name} · Official Receipt · Powered by Akoso" and the notification names the child ("We received ₦45,000 for Chidi."), following the brand voice in section 4.0. Receipt numbers follow the rules below.
5. Overpayment becomes family credit, applied automatically to the next invoice.
6. A nightly job compares stored payments with the provider's transaction list and records anything missed.

**Receipt numbers**

- Number receipts per school in one unbroken sequence, optionally restarting each session, e.g. `GA/2027-28/000412`.
- Take numbers from a single counter per school, locked inside the same database transaction that creates the receipt, so two payments arriving together can never share a number and a failed transaction never uses one up. Do not use plain database sequences, which skip numbers on rollback.
- A cancelled receipt keeps its number and is marked "Cancelled — replaced by receipt …". Numbers are never reused or deleted, so the sequence has no holes.

**Payments into the school's own bank account (bank-statement import)**

Many parents will keep paying into the school's existing bank account (by transfer, standing order or cash at a branch), especially at first. Those payments never pass through Paystack.

- Bursars upload a statement downloaded from internet banking (CSV or Excel at first; PDF later if needed), with saved column formats per bank, reusing the import tool in section 10.
- Transactions already seen are ignored, so overlapping statements never count anything twice.
- For each money-in line, Akoso suggests a billing account from the amount (against outstanding balances), the sender's name (against guardian and sponsor names) and student names or admission numbers in the narration, with a confidence level. The bursar confirms with one tap; nothing is matched automatically below a school-set confidence.
- Confirmed lines become normal payments (source: bank statement) with receipts; the rest go to the unmatched queue. Paystack payout lines are recognised as payouts, not new payments (below).
- Receipts for these payments include a line such as "Next time, pay into your fees account: Wema 0123456789", to move parents over gradually.
- An open-banking connection that fetches statements automatically is a later option: record it in an ADR, not for launch.

**Paystack payouts to the school (settlement matching)**

Paystack pays the school once per working day for many payments, minus its fees, so the school's bank shows one line where Akoso shows many payments.

- Fetch payouts from the provider's API and link each one to the payments, fees, refunds and chargebacks it covers.
- A daily payout report shows the expected amount, the amount received and any difference. Alert on a payment not paid out after a set number of days, a payout that doesn't equal payments minus fees minus refunds, and a failed or held payout.
- Keep two views: family balances use the date the parent paid; the cashbook and bank view use the date the money reached the school's bank (section 16).

**Moving a payment to the right family**

Dedicated account numbers look alike, so some parents will pay into the wrong family's account.

- A "Move payment" action: the bursar picks the payment, the correct billing account (and optionally the child or invoice), a reason and evidence (e.g. the parent's transfer screenshot).
- It needs a second authorised person's approval above a school-set amount (section 28.3).
- Akoso reverses the original allocations (so the wrong family's invoices reopen), creates the new allocations, marks the original receipt cancelled and replaced, issues a new receipt, and sends both families a short, polite notice with their correct balance.
- Payments are never edited or deleted; the move is a linked set of new entries.

**Refunds and disputes**

- Under Paystack's terms, refunds and chargebacks on payments through Akoso are charged to Akoso's main account, not the school's. So school-fee refunds are made by the school from its own bank account and recorded in Akoso with evidence, not sent through Paystack's refund API. Use the refund API only for Akoso's own platform fee.
- A chargeback (card dispute) alerts the bursar and Akoso at once, with a place to upload evidence. Paystack accepts unanswered disputes automatically after a short window (16 hours in Nigeria at the time of writing), so respond the same day. A lost chargeback is recovered from the school under its agreement with Akoso (section 25.1).

**Provider fees**

- Record the provider's transaction fee on every payment, separately from the amount the parent paid, so fee reports and the cashbook reconcile with bank settlements.
- Credit the family with the full amount they transferred. The school bears provider fees; parents are never charged a processing fee on top of their school fees.

Also support:

- Card or transfer checkout from the parent app for any amount (part payment allowed unless the school sets a minimum). Every payment screen, invoice and reminder shows the fees account number first and card payment second.
- Manual entry of cash, POS and bank-teller payments, with an evidence photo and the collector's name.
- An **unmatched payments** queue for transfers that cannot be matched, with manual assignment and ageing.
- Refunds, reversals and credit notes as new entries with reasons. Never edit or delete a payment.
- A daily cash-up per collector, with a bursar audit trail.
- Debtor dashboard: expected, collected, outstanding and collection rate by class, updated live, with aged-debt buckets and export.
- Automated reminders: scheduled per school, sent only to families with a balance, respecting quiet hours, and stopping once paid. Reminders invite parents to clear the balance or the next instalment in one payment ("Clear your balance of ₦85,000"), not to send small top-ups.

Acceptance:

- A webhook delivered twice creates exactly one payment.
- Property-based tests prove no money is ever created or lost: every kobo is allocated, held as credit, or in the unmatched queue.
- At least 95% of transfers are matched automatically in the pilot.
- The proprietor sees expected vs collected live.
- Re-uploading the same bank statement creates no duplicates; a moved payment leaves both families' balances and receipts correct; 100 simultaneous payments get 100 receipt numbers with no gaps or duplicates.

