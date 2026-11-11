# Akoso Voice Guide

For every UI string, empty state, error, notification and message template (brief
section 4.0). Review every message template against this page.

**The voice:** calm, confident and precise, like a trusted bursar or head teacher. It
reassures rather than hypes.

## Rules

1. **No exclamation marks and no emojis** in system messages.
2. **State numbers plainly.** Amounts in naira with thousands separators.
3. **To parents: warm, and about their child by name.**
4. **To proprietors: respectful, about _their_ school.** The school is the hero; Akoso
   stays in the background.
5. **Errors say what happened and what to do next, without blame.**
6. **Signed with the school's name,** not Akoso's, in emails, SMS and WhatsApp.
7. **Write "Akoso"**: capital A, never all caps. The tonal spelling _àkóso_ appears only
   where the name's meaning is explained.
8. **To parents, a dedicated account is the "fees account".** Never "virtual account",
   "DVA" or "wallet".
9. **Say only what is true.** Never "tamper-proof", "fully compliant", "error-free" or
   "guaranteed".
10. **Plain English.** Short sentences. Dates as dd/mm/yyyy.

## Do and don't

| Situation                      | Do                                                                                                                                | Don't                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Payment received               | We received ₦45,000 for Chidi and Ada.                                                                                            | Payment successful!                      |
| Payment with a balance         | ₦45,000 received. Balance: ₦15,000.                                                                                               | Thanks for paying! You still owe ₦15,000 |
| Result published               | Chidi's term 2 report card is ready.                                                                                              | Result published                         |
| Score above the maximum        | This score is above the CA1 maximum of 10. Please check it.                                                                       | Invalid input                            |
| Fee reminder                   | Clear your balance of ₦85,000 for Ada. Pay into your fees account: Wema 0123456789.                                               | URGENT: your fees are overdue!!!         |
| Absence alert                  | Ada was marked absent this morning. If this is a mistake, please tell the school office.                                          | Your child is absent                     |
| Offline                        | You are offline. 12 changes are saved on this phone and will sync when you reconnect.                                             | No connection. Changes may be lost       |
| Nothing to show (proprietor)   | No payments yet this term. They will appear here as parents pay.                                                                  | Nothing here!                            |
| No permission                  | You don't have access to payroll. Ask your proprietor if you need it.                                                             | 403 Forbidden                            |
| Something went wrong           | We couldn't save this score sheet. Your entries are still on this phone. Please try again.                                        | Oops! Something went wrong               |
| Results withheld (to a parent) | Chidi's report card is ready. Please clear the balance of ₦30,000 to view it online, or collect the printed copy from the school. | Access denied: unpaid fees               |
| Message from a school          | Greenfield Academy: We received ₦45,000 for Chidi.                                                                                | Akoso: Payment of NGN 45000.00 confirmed |

## Brand lines

Stored as configuration in `packages/core/src/config/brand.ts`, never hard-coded in a
screen.

| Where                                            | Line                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Lead line and logo lockup                        | Akoso — Your whole school, brought together.                                              |
| Sign-in, onboarding, the sales demo              | Your whole school, brought together. (Alternate: Run the school. Akoso handles the rest.) |
| Proprietor dashboard empty states and onboarding | Know your school, every day.                                                              |
| Parent welcome and install screens               | Your child's school life, in your hand.                                                   |

## School first, Akoso second

Inside a school's portal, report cards and receipts, the school's name, logo and colour
lead. Akoso appears only as a small, quiet attribution:

- Report card footer: "Results prepared with Akoso"
- Receipt header: "{School name} · Official Receipt · Powered by Akoso"

## Languages

The interface is in English. Message templates may also have Pidgin, Yoruba, Hausa and
Igbo versions; each follows the same rules. Schools can override report-card labels.

**Not yet reviewed:** the example strings on this page are drafts for the founder to
approve; none is in the product yet.
