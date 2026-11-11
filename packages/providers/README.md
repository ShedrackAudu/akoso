# @akoso/providers

Every external service behind an interface, so swapping a provider never touches business logic (brief section 3.1).

| Folder      | Interface                                                                                                                                                            | Brief      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `payments/` | PaymentProvider: subaccounts, dedicated accounts, splits, checkout, direct debit, payouts and webhook verification. Paystack first, Monnify with the same interface. | 14, 25.1   |
| `sms/`      | SmsProvider: transactional SMS on the DND route. Termii first, Africa's Talking as backup.                                                                           | 17         |
| `whatsapp/` | WhatsAppProvider: approved utility and authentication templates on the Meta WhatsApp Cloud API.                                                                      | 17         |
| `email/`    | EmailProvider: receipts, report cards and invitations through Resend or Amazon SES.                                                                                  | 17         |
| `push/`     | PushProvider: web push (VAPID) and Expo push to registered devices.                                                                                                  | 5.1, 17    |
| `pdf/`      | PdfRenderer: HTML to PDF through the Gotenberg container, called only from the worker.                                                                               | 12         |
| `ai/`       | AiDrafts: comment and lesson-note drafts. No names or identifiers ever leave Akoso.                                                                                  | 11, 19, 29 |
| `domains/`  | DomainProvider: custom hostname verification and certificates through Cloudflare for SaaS.                                                                           | 7.1        |
| `storage/`  | ObjectStorage: tenant-prefixed keys and short-lived signed URLs on S3-compatible storage (R2, MinIO locally).                                                        | 7, 28      |

Each folder has `port.ts` (the interface), `fake.ts` (the adapter used in tests and local development) and, later, one file per real adapter. Real adapters read their keys from validated environment variables; no key is ever hard-coded.

**Status:** placeholders only.
