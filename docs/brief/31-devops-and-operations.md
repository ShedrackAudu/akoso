## 31. DevOps and operations

Set up:

- **Environments:** dev (local Docker Compose), staging (production-like, synthetic data) and production.
- **CI/CD (GitHub Actions):** typecheck, lint, unit, golden-file, property, tenant-isolation and integration tests on every pull request; automatic deploy to staging; manual approval to production; one-click rollback.
- **Migrations:** reviewed, reversible where possible, run by the migration role only.
- **Feature flags** per tenant for gradual rollout.
- **Change freeze:** no production deploys during a pilot or customer school's result week or resumption week, except urgent fixes.
- **Observability:** Sentry for errors, uptime checks from Nigeria, structured logs, product analytics (e.g. PostHog: activation funnels by role, feature-flag exposure), queue depth, PDF render time, webhook failure and reconciliation mismatch alerts sent to my phone.
- **Pilot metrics** (on a platform-admin screen, per school): time to produce report cards, result errors reported by parents, DVA auto-match rate, share of fee money arriving through family accounts versus the school's own bank account, unmatched-queue age, bursar reconciliation time (baseline vs pilot, entered by us), parent activation rate, message cost per family, support tickets per 100 students, and support median first-response time.
- **Backups:** managed Postgres point-in-time recovery; nightly encrypted logical export to a second region; object storage versioning. Recovery point ≤ 15 minutes, recovery time ≤ 4 hours. Restore drill every term; a restore into staging must be proven in under 2 hours.
- **Status page** for schools and an incident communication template.
- **Cost tracking** per tenant and per active student: messaging, storage and PDF compute.
- **Hosting region** chosen by measured latency from Lagos, Abuja and Port Harcourt; the cross-border data transfer basis documented.
- **On-call rota** and escalation, ready before launch.
- **Runbooks** in `docs/runbooks/` for deploys, rollback, restore, payment-provider outage (switch to Monnify), messaging outage, results corrupted and data breach; post-mortem template.

