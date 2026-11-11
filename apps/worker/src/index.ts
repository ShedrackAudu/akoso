// The worker entry point will go here: it starts pg-boss and registers each module's jobs
// (PDFs, messages, payment events, reconciliation, domain checks, reminders).
// Every job is idempotent and retryable, and calls use cases in @akoso/core.
export {}
