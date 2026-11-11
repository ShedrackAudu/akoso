## 33. Deliverables

Provide:

- Complete, working source code in the monorepo structure:

```
apps/
  web/        # Next.js: the app at app.akoso.ng (PWA for parents and staff, admin screens, /api/v1) and school public pages
  admin/      # platform admin area (or a route group in web)
  worker/     # background jobs: PDFs, messages, payments, domains, reminders
  mobile/     # Expo app foundation (section 5)
packages/
  core/       # use-case services shared by server actions and /api/v1
  db/         # Drizzle schema, migrations, RLS policies, withTenant()
  domain/     # pure logic: results, fee allocation, payroll
  schemas/    # shared Zod schemas
  api-client/ # typed client generated from OpenAPI
  providers/  # payments, sms, whatsapp, email, pdf, ai, domain adapters
  ui/         # shadcn-based design system
docs/
  brief/ specs/ adr/ runbooks/ legal-templates/ help/ security/
  PRD.md  ARCHITECTURE.md  ARCHITECTURE-ESSENTIALS.md  risks.md  progress.md  decisions.md  founder-checklist.md
  permissions.md  testing.md  mobile.md  velocity.md  brand-voice.md  glossary.md  tech-debt.md
AGENTS.md     # rules for all coding agents (single source of truth)
CLAUDE.md     # Claude Code notes + pointer to AGENTS.md
GEMINI.md     # Gemini notes + pointer to AGENTS.md
```

- Database migrations, RLS policies and seed scripts (presets and demo school).
- `README.md` with local setup in under 15 minutes on Windows, macOS or Linux.
- `.env.example` with every variable explained.
- API documentation for internal endpoints and webhooks.
- Help-centre content in `docs/help/`: role-based guides for proprietors, bursars, teachers and parents; scripts for 2-minute videos in English and Pidgin; a results-week checklist; a resumption-week fees checklist; and a training outline for two 60-minute sessions per school (admin/bursar and teachers).
- Deployment guide, backup and restore guide, and runbooks.
- Legal and privacy templates marked "for legal review".
- A changelog.

