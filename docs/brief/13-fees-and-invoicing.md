## 13. Fees and invoicing

Implement:

- Fee items scoped to school, level, class, arm or individual student; mandatory or optional (bus, lunch, uniform, books, excursion, PTA levy). Each fee item also has:
  - **How often:** once, per term, per session (charged in one term or spread across terms) or ad hoc.
  - **What triggers it:** the term's invoice run, admission or acceptance (e.g. acceptance fee, development levy, starter pack), entering a level, or signing up for an event or excursion.
  - **Refundable:** e.g. caution deposits, held as money owed back to the family, tracked in a deposits report, and refunded or applied when the student leaves.
  - **Pass-through:** money the school collects for someone else (e.g. WAEC, NECO and BECE registration fees), reported separately from school income.
- Invoices go to billing accounts (section 9). A sponsor gets one combined invoice and statement for all the children it pays for.
- Discounts: sibling, staff child, scholarship, bursary; percentage or fixed; per item or per invoice. Discounts above a school-set threshold need proprietor approval.
- **Write-offs:** forgiving money already owed (e.g. a family that left owing fees, or a balance the proprietor waives). A write-off is separate from a discount (which is planned before invoicing), needs approval by two authorised people (section 28.3), shows on the family statement and in reports, and can only be undone by another approved entry. Former students who still owe stay on the debtors list until paid or written off.
- Bulk invoice run per term with a preview of totals per class before issuing; 600 invoices in under 2 minutes.
- Arrears carried forward as a separate invoice line.
- Instalment plans per billing account with due dates. Schools set the maximum number of instalments per term (e.g. three), because Paystack charges its fee on every payment: one ₦300,000 transfer costs ₦300, ten ₦30,000 transfers cost ₦3,000.
- Family statement showing every invoice, payment, discount, credit and balance.
- Next-term fees shown on report cards.

Store all money as integer kobo.

