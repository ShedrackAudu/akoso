## 29. Privacy and NDPA compliance readiness

The platform processes children's personal data under Nigeria's Data Protection Act 2023 and the NDPC's General Application and Implementation Directive (GAID) 2025. Each school is the **data controller**; the platform is the **data processor**. Under the NDPA, a child is anyone under 18.

Build these product features:

- **Guardian consent ledger:** a versioned privacy notice per school; consent captured per child with timestamp and channel; student accounts (section 43) only after guardian approval (verifying the guardian, as NDPA s.31 requires); no marketing to children. The ledger also records photo and media consent per child (ID cards, the school's website and social media, newsletters), each a separate yes or no the guardian can change, and features that use photos respect it.
- **Terms acceptance:** record which version of the terms of service and the data processing agreement each school accepted, when and by whom, and ask again when they change.
- **Data subject requests:** access, correction and deletion requests logged and fulfilled; a full export of a person's data in under 5 minutes.
- **Data retention settings:** per data type, with automatic archiving of withdrawn students and deletion when lawful.
- **Health and sensitive data:** restricted roles, audited views, minimal collection.
- **AI data minimisation:** no names or identifiers sent to the AI provider (section 11), only scores, trends, trait ratings and attendance; each school can turn AI drafts off; documented in the DPIA, including the cross-border transfer to the AI provider.
- **Sub-processor register:** hosting, Paystack, Monnify, Termii, Meta, email provider, AI provider; shown to schools.
- **Breach workflow:** internal incident record, impact assessment, notification to the NDPC within 72 hours and to affected schools without delay.
- **School compliance helper:** a checklist in school settings for the school's own NDPC registration as a data controller (with renewal reminders), its privacy notice and its consent status.
- **School data export** at any time and on exit.

Provide templates (for legal review, not as final documents):

- Privacy notice for parents and staff
- Data processing agreement between the platform and each school
- Terms of service, acceptable use policy, SLA (99.5% monthly uptime target, excluding planned maintenance outside school hours) and refund policy
- Agent agreement
- Data protection impact assessment outline
- Breach response runbook
- Parent consent form for school-fees payment accounts (section 29.1)

Do not claim legal compliance or certification. State in the documentation that a Nigerian data-protection lawyer and a licensed Data Protection Compliance Organisation must review all legal documents and the platform's NDPC registration tier.

### 29.1 Parent consent form for payment accounts

Dedicated account numbers are created only after the school confirms a parent's consent (section 14). Provide the text below, unchanged except for the placeholders, as `docs/legal-templates/parent-payment-account-consent.md` and as a printable one-page PDF in the school onboarding pack, for schools to add to their enrolment or fee forms (or send home as a slip for existing families). Mark it "for legal review". In Akoso, the bursar records "consent received" per payer (one by one or in the import file), the consent ledger stores who confirmed it and when, and withdrawing consent stops new payments into that account and switches the family to card or bank-statement payments. Collect it once per payer: separated parents and sponsors each sign their own.

> **School fees payment account: parent consent**
>
> [School name] uses Akoso to manage school fees. To make paying easier, we can give you your own fees account number. Any money you transfer into it is recorded straight away against your child's fees, and you get a receipt automatically.
>
> To create this account, we share your name, phone number and email address with Akoso and its payment partner, Paystack, and Paystack's partner bank. Your name will appear on the account, after the school's name (for example, "[SCHOOL NAME] / [YOUR NAME]"), so you can confirm you are paying the right school.
>
> Please note:
> - This account is only for paying school fees to [School name]. It is not a personal bank account: you cannot save in it or withdraw from it, and all money paid into it goes to the school.
> - We do not need your BVN for this account.
> - Your details are used only to create and run this account, as explained in our privacy notice: [link or "available from the school office"].
> - You can withdraw your consent at any time by telling the school office. You can then pay by card or into the school's bank account instead.
>
> ☐ **I agree** that [School name] may create a school fees account number in my name, as described above.
> ☐ **I do not agree.** I will pay by card or into the school's bank account.
>
> Parent or guardian's name: ______________________
> Child's / children's names: ______________________
> Phone number: ______________________
> Signature: ______________________ Date: ____ / ____ / ________

