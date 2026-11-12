# Security policy

Akoso holds children's records, school results and fee payments, so we take every
report seriously.

## Reporting a vulnerability

Email **security@akoso.ng** with:

- what you found and where (address, page or file)
- the steps to reproduce it
- what an attacker could do with it

Please **do not** open a public GitHub issue, and do not access, change or delete data
that is not yours. Test only against your own account. If you see another school's or
family's data, stop, and tell us what you saw so we can trace it.

We confirm receipt within **2 working days** and keep you updated until it is fixed.

## How fast we fix

| Severity       | Fixed within             |
| -------------- | ------------------------ |
| Critical       | 72 hours                 |
| High           | 14 days                  |
| Medium and low | the next planned release |

If you report in good faith and follow this policy, we will not take legal action
against you, and with your permission we will credit you once the fix is out.

## Scope

In scope: the Akoso web app, the platform admin, the `/api/v1` API, webhooks and the
mobile apps, and this repository.

Out of scope: denial-of-service testing, social engineering of schools, parents or
staff, physical attacks, and third-party services (Paystack, Termii, WhatsApp) except
where Akoso's use of them is at fault.

## Supported versions

Only the version currently running in production is supported.
