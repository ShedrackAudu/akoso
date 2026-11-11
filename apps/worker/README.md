# apps/worker

A separate process from the same codebase that runs background jobs on pg-boss (which
runs on Postgres): report-card and receipt PDFs through Gotenberg, messages, payment
webhook processing and allocation, nightly reconciliation, bulk invoice runs, imports,
custom-domain checks and reminders.

## Rules

- Long or heavy work always runs here, never inside a web request (brief section 3.1).
- Every job is idempotent and retryable, tracks its progress, and is safe to run twice.
- Jobs call use cases in `@akoso/core`; they hold no business logic of their own.
- The worker is stateless: nothing is kept on local disk or in memory between jobs.
- Each log line is structured JSON with tenant ID, job ID and request ID, and no personal data.

**Status:** placeholder. No runner or job exists yet, so there is no `dev` script. How the
worker is run in development and built for production is decided in Stage 1
(`docs/decisions.md`).
