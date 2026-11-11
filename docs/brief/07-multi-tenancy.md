## 7. Multi-tenancy

This is a critical requirement. One school must never see or change another school's data.

Implement:

- A shared PostgreSQL schema where every tenant-owned table has `tenant_id uuid NOT NULL`, first in every composite index.
- RLS **enabled and forced** on every tenant table, with both `USING` and `WITH CHECK` policies.
- Tenant context set per transaction with `set_config('app.tenant_id', $1, true)` inside `withTenant()`. Queries with no tenant set must return no rows.
- An application database role without SUPERUSER or BYPASSRLS; a separate migration role.
- **One address for the app.** The signed-in app for parents and staff (the PWA, server actions and `/api/v1`) lives at one origin, `app.{domain}` (planned `app.akoso.ng`; the base domain comes from `APP_BASE_DOMAIN`). After login the user picks a school; the selected school travels with every request and is checked against the user's memberships. One install, one service worker and one login therefore cover a parent with children in several schools, and the auth cookie lives on one host only.
- **School addresses.** Each school's subdomain (`{slug}.{domain}`, e.g. `greenfield.akoso.ng`) or custom domain (section 7.1) serves its public, school-branded pages: the admissions form, document and receipt verification, and a sign-in button that opens `app.{domain}` with the school preselected. Middleware resolves the school from the host for these pages.
- A **group** entity above schools, so one owner can run several branches. Design this from day one even if the group screens come later.
- Server-side authorisation checks in every server action and route, in addition to RLS.
- An automated test that creates two tenants and proves tenant A cannot read, insert, update or delete tenant B's rows, for every table. It runs on every pull request.

Use the same rules for files: object keys are prefixed with the tenant ID, and every download goes through an authorised, short-lived signed URL.

### 7.1 Custom domains

A school can use its own domain (e.g. `portal.greenfieldschool.com`) instead of `{slug}.{domain}`. Available on the Premium plan by default (configurable).

- **Adding a domain:** the proprietor enters a hostname in Settings → Domain. Show step-by-step DNS instructions: a CNAME from the hostname to `custom.{domain}`, plus a TXT record containing an unpredictable verification token that expires after 7 days. Support subdomains first; explain that apex domains need a DNS provider with CNAME flattening or ALIAS records.
- **Certificates:** use Cloudflare for SaaS custom hostnames through its API to verify ownership and issue and renew TLS certificates automatically. Put this behind a `DomainProvider` interface.
- **States:** pending DNS → verifying → active → failing → removed. The worker re-checks pending domains with backoff and active domains daily, and notifies the proprietor if DNS breaks or a certificate fails to renew.
- **Routing:** middleware resolves the request host against a `tenant_domains` table (cached, invalidated on change) before falling back to the subdomain. Unknown hosts get a 404, never a default school.
- **Primary domain:** while a custom domain is active, the subdomain redirects to it, and links in emails, WhatsApp, SMS, receipts and report-card QR codes use it. If the custom domain fails, the redirect stops automatically and the subdomain keeps working.
- **Security:** validate the Host header against known domains; never set auth cookies on school subdomains or custom domains (sign-in happens only at `app.{domain}`); include active custom domains in allowed origins and CSP where their public pages need it.
- Removing a domain reverts the school to its subdomain immediately. Every domain change is audit-logged, and the platform admin sees each school's domain and certificate status.

