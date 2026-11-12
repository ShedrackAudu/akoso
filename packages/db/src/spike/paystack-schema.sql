-- Spike 04 only (docs/specs/stage-1-spike-04-paystack.md). The webhook inbox, removed
-- when the real payments module replaces it. Run as the local superuser:
-- `pnpm spike:paystack:setup`. Safe to run again; it starts from empty.
--
-- A webhook arrives before Akoso knows which school it belongs to, so the inbox is a
-- platform table, not a tenant table: no tenant_id and no row-level security. It is
-- append-only: the app role may insert and read, never change or delete (brief 28.3).

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS spike_paystack CASCADE;
CREATE SCHEMA spike_paystack AUTHORIZATION akoso_migrator;
GRANT USAGE ON SCHEMA spike_paystack TO akoso_app;

SET ROLE akoso_migrator;

CREATE TABLE spike_paystack.webhook_inbox (
  -- The event name and Paystack's reference, so a repeat delivery is stored once.
  dedupe_key text PRIMARY KEY,
  event text NOT NULL,
  reference text,
  -- Which signing key matched; never the key itself.
  signature_key_id text NOT NULL,
  -- Exactly the bytes Paystack sent, for replay and audit.
  raw_body text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  -- Repeat deliveries are counted, not stored again.
  first_seen_signature_time timestamptz
);

-- Repeats are recorded here, append-only, so the inbox row itself never changes.
CREATE TABLE spike_paystack.webhook_repeats (
  dedupe_key text NOT NULL REFERENCES spike_paystack.webhook_inbox (dedupe_key),
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON spike_paystack.webhook_inbox TO akoso_app;
GRANT SELECT, INSERT ON spike_paystack.webhook_repeats TO akoso_app;

RESET ROLE;
