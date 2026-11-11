## 28. Application security

Apply secure development practices throughout. Protect against:

- Broken access control and **tenant data leakage** (the top risk)
- SQL injection (use Drizzle's parameterised queries; no string-built SQL)
- Cross-site scripting (contextual output encoding; sanitise rich text)
- Cross-site request forgery
- Session hijacking and fixation
- Brute-force login and OTP abuse (rate limits, lockouts, alerts)
- Insecure direct object references (every ID lookup is tenant-scoped and permission-checked)
- Server-side request forgery (no user-supplied URLs fetched by the server)
- Open redirects, Host-header attacks and path traversal
- Insecure file uploads (allow-listed types, size limits, re-encoded images, private storage)
- Webhook spoofing and replay (signature verification, idempotency, timestamp checks)
- Mass assignment (Zod schemas define exactly which fields are accepted)
- Secrets exposure

Also implement:

- A strict Content Security Policy, HSTS, X-Content-Type-Options, Referrer-Policy and Permissions-Policy.
- Encryption in transit (TLS everywhere) and at rest; field-level encryption for staff bank details and national IDs.
- Signed, short-lived URLs (≤ 15 minutes) for every file and PDF.
- Least-privilege database roles and cloud credentials.
- Dependency and secret scanning in CI.
- An append-only audit log of score changes, approvals, fee items, discounts, payments, refunds, role changes, impersonation, exports and health-record views.
- A quarterly access review report: every staff and platform user with elevated roles, last login and MFA status, for the school and for us.
- An incident response runbook covering: payments down, messaging down, results corrupted, suspected data breach.
- An external penetration test or independent security review before launch (budget permitting); fix critical findings before go-live.

Never commit secrets, private keys or credentials. Never log passwords, OTPs, tokens, full card data or health details.

### 28.1 Security standards to follow

Security is part of every slice, not a final pass. Follow these recognised standards throughout, using their latest published versions, and treat any gap as a bug:

- **OWASP Top 10** (web applications): every item addressed by design, with tests where testable.
- **OWASP Application Security Verification Standard (ASVS):** target **Level 2** for the whole platform, plus selected **Level 3** controls where the risk is highest: authentication, sessions, payments, payroll, results approval and the platform admin area. Record in the checklist which Level 3 controls you adopted and why. Keep a checklist in `docs/security/asvs.md` mapping each requirement to the code or test that meets it, or a recorded reason it does not apply.
- **OWASP API Security Top 10** for `/api/v1`, webhooks and internal endpoints (object-level and function-level authorisation on every call, rate limits, no excessive data exposure, inventory of every endpoint).
- **OWASP Mobile Top 10 and MASVS** for the Expo apps (secure token storage, certificate pinning decision recorded in an ADR, no secrets in the app bundle, protection against tampered or rooted devices where practical).
- **OWASP Cheat Sheet Series** as the default reference for implementation details (authentication, session management, password storage, file upload, CSRF, XSS, logging, secrets).
- **CWE Top 25** weaknesses checked by static analysis.
- **Payment card rules:** no card data ever touches Akoso's servers; checkout uses the provider's hosted page or SDK, so PCI DSS scope stays minimal.

### 28.2 Secure development lifecycle

- **Threat model before building.** Each spec for a feature touching auth, money, results, personal data, files or tenancy includes a short threat model (STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) with the mitigations, reviewed by me.
- **Automated checks in CI, failing the build on high or critical findings:**
  - static analysis (SAST, e.g. Semgrep and CodeQL) with security rule sets
  - dependency vulnerability scanning (e.g. `pnpm audit`, OSV-Scanner, Dependabot/Renovate alerts)
  - secret scanning (e.g. gitleaks) on every commit and pull request
  - container image scanning (e.g. Trivy)
  - infrastructure and configuration scanning for misconfigurations
  - a dynamic scan (DAST, e.g. OWASP ZAP) against staging on a schedule and before each release
- **Security tests** for every OWASP Top 10 category that can be tested: injection, broken access control (including cross-tenant attempts), XSS, CSRF, SSRF, insecure file upload, authentication and session attacks, rate-limit bypass.
- **Review:** all security-sensitive changes get the cross-model review in section 3 plus my approval. Never disable a security check to make a build pass; raise it with me instead.
- **Penetration test** by an independent tester before launch and after major changes; fix critical and high findings before go-live, and record accepted risks with my sign-off.
- **Vulnerability handling:** a `SECURITY.md` and `/.well-known/security.txt` with a contact for responsible disclosure; patch critical vulnerabilities within 72 hours and high ones within 14 days.

### 28.3 Tamper resistance and tamper evidence

The platform must make tampering with results, money and records extremely hard, and make any attempt visible and traceable. No system can honestly be called "tamper-proof", so build for **tamper-resistant and tamper-evident**, and never describe it as tamper-proof to customers.

- **Server is the only source of truth.** Never trust anything computed or sent by a browser or app: totals, grades, positions, balances, prices, discounts, roles and tenant IDs are always recomputed or re-checked on the server.
- **Immutable records.** Payments, allocations, refunds, credit-ledger entries, result snapshots, payslips and audit events are append-only. Corrections are new entries that reference the original, with a reason. Enforce this in the database (revoke `UPDATE` and `DELETE` for the application role on these tables, or block them with triggers), not only in code.
- **Hash-chained audit log.** Each audit event stores a hash of its content and of the previous event for that tenant, so any edited, deleted or inserted event breaks the chain. A daily job verifies the chain and alerts me on any break. Copy audit events daily to write-once storage (object storage with object lock) outside the main database. Because audit entries hold internal IDs, not names or sensitive values (section 27), personal data can be deleted or pseudonymised elsewhere without breaking the chain.
- **Signed results and receipts.** When results are approved and published, store a cryptographic hash of each snapshot. Report cards, transcripts and receipts carry a verification QR code (section 12) that checks the document against the stored signature, so an edited PDF or a forged receipt is detected.
- **Two-person control for high-risk actions:** unlocking approved results after publishing, large discounts and write-offs, refunds above a threshold, payroll approval, changing a school's settlement bank account, and bulk deletions require a second authorised person to approve. Changes to the settlement account also trigger a notification to the proprietor and a cooling-off period before payouts use the new account.
- **Integrity checks on money:** a nightly job proves every kobo balances (payments = allocations + credits + unmatched), compares against the provider's records, and alerts on any difference.
- **Webhook and job integrity:** signatures and timestamps verified, replay rejected, every event stored raw before processing.
- **Least privilege everywhere:** separate database roles for the app, worker, migrations and read-only reporting; no shared admin accounts; production access only through audited, time-limited break-glass access with MFA.
- **Supply-chain integrity:** committed lockfile with exact versions, CI that installs with a frozen lockfile, GitHub Actions pinned to commit SHAs, protected main branch with required reviews and status checks, signed commits, a software bill of materials (SBOM) for each release, and build provenance for container images.
- **Client tampering:** the PWA and mobile apps only hold data the user may see; offline data is scoped to the signed-in user and cleared on logout; all offline operations are re-validated on sync, including permissions and locked states.
- **Detection and response:** alerts for unusual activity (many failed logins, score changes after approval, bulk exports, permission changes, settlement-account changes, impersonation, activity from new countries), visible to me and to the school's proprietor where relevant, and covered by the incident runbook.

Keep `docs/security/` up to date with the threat models, the ASVS checklist, scan results summaries, pen-test reports and accepted risks.

### 28.4 Pre-launch security checklist

Before the pilot readiness gate and again before launch, go through this checklist, verify each item against the actual code and running staging environment (not just the documentation), and record the result, evidence and any fix in `docs/security/pre-launch-checklist.md`. Every item must pass or have a risk I have accepted in writing.

1. **API keys and secrets hidden:** no secret in client code, mobile bundles, logs or error messages; only deliberately public values use the `NEXT_PUBLIC_` (or Expo public) prefix; secrets live only in the secret store.
2. **Git history clean:** scan the full history for secrets; any secret ever committed is rotated immediately and, where needed, removed from history.
3. **No database credentials on the client:** browsers and apps never talk to the database directly; only the server uses the least-privilege app role.
4. **Row-level security on** and forced on every tenant table, proven by the isolation tests.
5. **Sensitive data encrypted** at rest and in transit (bank details, national IDs, health data).
6. **Authentication and authorisation on the server** for every page, action, API route, file and job.
7. **Record-level access locked:** every lookup by ID checks tenant and ownership (no reading another family's invoice by changing an ID).
8. **Field tampering blocked:** only fields in the Zod schema are accepted; roles, tenant, prices, totals and statuses can never be set from the client.
9. **Session cookies secure:** HttpOnly, Secure, SameSite, short-lived, rotated on login and privilege change.
10. **Passwords hashed** with a modern slow algorithm (Argon2id or scrypt, as Better Auth supports); OTPs stored only as hashes and expire quickly.
11. **Login and OTP rate-limited** per account, phone number, IP and tenant, with lockout and alerts.
12. **Bot and abuse protection** (e.g. Cloudflare Turnstile) on public forms, sign-up, OTP requests and the admissions page, plus OTP limits per phone number and country to prevent SMS-pumping fraud that would burn message credits.
13. **Queries parameterised** everywhere; no SQL built from strings.
14. **All input validated** on the server, including webhooks, imports and offline sync.
15. **User content escaped** on output, and rich text sanitised.
16. **File uploads restricted:** allowed types, size limits, content checks, re-encoded images, private storage, no execution.
17. **API responses trimmed:** responses use explicit output schemas and return only the fields the caller needs, never whole database rows or other users' data.
18. **Security headers** set (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protection).
19. **HTTPS forced** everywhere, including custom domains, with HSTS and no mixed content.
20. **Errors and logs safe:** no stack traces, SQL or internal details shown to users; logs free of personal data and secrets.


