## 2. Technology stack

Use this stack unless a compelling technical limitation requires an alternative. If you change anything, write an Architecture Decision Record (ADR) in `docs/adr/` explaining why.

**Language and framework**

- TypeScript in strict mode, end to end
- Next.js (App Router) for web app and API: server components, server actions and typed route handlers, plus a versioned REST API at /api/v1 (section 5.1)
- pnpm workspaces monorepo (web app, worker and an Expo mobile foundation, section 5)

**Frontend**

- Tailwind CSS and shadcn/ui, initialised from preset b4bg87xLw8 with the shadcn skill and MCP server (section 4.2)
- Phosphor Icons (`@phosphor-icons/react`) as the only icon library, as set by the preset
- TanStack Table for score sheets, broadsheets and lists
- React Hook Form with Zod validation
- Installable Progressive Web App (PWA) using Serwist, with Dexie (IndexedDB) for offline data
- A lightweight chart library (e.g. Recharts) for dashboards

**Backend and data**

- PostgreSQL 16+ with row-level security (RLS)
- Drizzle ORM and Drizzle migrations
- Zod schemas in a shared package, used by browser, server and worker
- Better Auth: phone OTP for parents; email and password with MFA for staff
- pg-boss job queue (runs on Postgres)
- A separate worker process from the same codebase
- Gotenberg container for HTML-to-PDF rendering
- S3-compatible object storage (Cloudflare R2) with signed URLs

**Integrations**

- Paystack: dedicated virtual accounts, subaccounts, split payments, checkout, Direct Debit, webhooks (primary)
- Monnify: reserved accounts (backup provider, same interface)
- Termii: SMS on the DND/transactional route (Africa's Talking as backup)
- Meta WhatsApp Cloud API: approved utility templates, on a Nigeria-registered WhatsApp Business Account
- Resend or Amazon SES for email
- Web Push (VAPID) for PWA notifications
- An LLM API (Claude or Gemini) for comment and lesson-note drafts only

**Development environment**

- Node.js LTS, pnpm, Docker Compose running Postgres, Gotenberg and MinIO (local S3)
- A seed script that creates a demo school with realistic, clearly fake data
- `.env.example` documenting every variable

**Production**

- Containers on a managed platform (Fly.io, Render or AWS) plus managed Postgres with point-in-time recovery
- Cloudflare for DNS, CDN, WAF and wildcard TLS
- Separate dev, staging and production environments
- Sentry, uptime checks, structured logs, product analytics (e.g. PostHog), a public status page
- Secrets in the hosting provider's secret store, never in code

