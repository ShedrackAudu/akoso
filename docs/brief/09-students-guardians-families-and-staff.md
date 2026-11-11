## 9. Students, guardians, families and staff

Implement:

- **Student record:** admission number (auto-format or manual), names, gender, date of birth, photo, class/arm, status (applicant, active, withdrawn, graduated), state of origin, LGA, religion (for CRS/IRS allocation), previous school, documents, custom fields, and an optional 16-digit Learner Identification Number (LIN) for the national DNEMIS system (linked to the NIN; validated for format and stored encrypted).
- **Guardian record:** names, phone (+234 normalised), email, address, occupation, relationship, WhatsApp opt-in, and one guardian marked as the fee payer.
- **Family:** siblings and their guardians. A guardian logs in once and sees all their children.
- **Billing accounts (who pays):** a billing account is a guardian or a sponsor organisation (an employer, NGO, church, scholarship body or government scheme). Each billing account has its own dedicated bank account, statement and receipts. By default a family has one billing account, the guardian marked as fee payer, so simple families stay simple. When fees are shared, each invoice line (or a percentage of it) is assigned to a billing account: for example, the father pays tuition and the mother pays bus and lunch, or an employer pays tuition for 12 children across 9 families on one combined invoice addressed to the company, with its TIN. A child can belong to two families (e.g. half-siblings). Build this model from Stage 2, even if sponsor screens come later, because invoices, dedicated accounts and allocations all depend on it.
- **Custody and access restrictions:** a person can be marked "do not release to" and/or "no access to records", with the reason and an optional court-order document. The gate check (section 21), the parent app, messaging and statements all enforce it. Only the proprietor, head teacher and safeguarding lead can set or see these restrictions, and every view and change is audited.
- **Medical information:** blood group, genotype, allergies, conditions, emergency contact. This is sensitive data with restricted access (section 21).
- **Authorised collectors:** people allowed to pick up a child, with photo and relationship (section 21).
- **Staff record:** names, role, phone, email, qualifications, employment date, state of residence (for PAYE), tax ID (TIN), pension fund administrator and RSA PIN, NHF number, bank details (encrypted), salary grade, assigned classes and subjects.
- **Enrolment history:** one record per student per term, so class history, results and fees stay correct after promotion.
- Search and filter by name, admission number, class, status, balance and guardian phone.
- Student and staff ID cards as a batch PDF (8 cards per A4 sheet) with photo, session validity and a QR code that only authorised staff can resolve; for students the QR opens the gate-pass and pickup verification screen (section 21).

Acceptance: one family with 3 children shares one guardian login and one dedicated account; a child whose tuition is paid by an employer and whose bus fee is paid by a parent gets correct invoices, statements and receipts for each payer; a "do not release to" person is refused at the gate check; the LIN field is validated and appears in exports.

