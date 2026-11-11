-- Spike 02 only (docs/specs/stage-1-spike-02-offline-queue.md). Throwaway tables for
-- offline score entry and sync, removed when the real score sheets replace them.
-- Run as the local superuser: `pnpm spike:offline:setup`. Safe to run again; it starts
-- from empty each time.
--
-- The tables live in their own schema, not in public, because the spike 01 catalogue
-- test requires every table in public to have cross-school test fixtures. They still
-- get row-level security, enabled and forced, like every tenant table.

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS spike_offline CASCADE;
CREATE SCHEMA spike_offline AUTHORIZATION akoso_migrator;
GRANT USAGE ON SCHEMA spike_offline TO akoso_app;

SET ROLE akoso_migrator;

-- One row per score cell or register entry, keyed like
-- 'score:<studentId>:<component>' or 'attendance:<studentId>:<yyyy-mm-dd>'.
-- `version` goes up by one on every change; offline edits say which version they
-- started from (brief section 20).
CREATE TABLE spike_offline.cells (
  tenant_id uuid NOT NULL,
  cell_key text NOT NULL,
  value text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  last_device_id text NOT NULL,
  last_op_id uuid NOT NULL,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, cell_key)
);

-- Every operation the server has received, by the phone's own ID, with what happened
-- to it. A repeat of the same operation gets the same answer and changes nothing.
CREATE TABLE spike_offline.applied_operations (
  tenant_id uuid NOT NULL,
  op_id uuid NOT NULL,
  cell_key text NOT NULL,
  outcome text NOT NULL,
  result_value text,
  result_version integer,
  message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, op_id)
);

-- Values that a later-received edit overwrote. Never edited or deleted: the head
-- teacher reviews them (brief section 20).
CREATE TABLE spike_offline.conflicts (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cell_key text NOT NULL,
  overwritten_value text NOT NULL,
  overwritten_version integer NOT NULL,
  overwritten_device_id text NOT NULL,
  winning_value text NOT NULL,
  winning_op_id uuid NOT NULL,
  winning_device_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX conflicts_tenant_received_idx ON spike_offline.conflicts (tenant_id, received_at);

-- Spike switches: whether the sheet is approved (locked), and whether the fake
-- teacher's session has expired.
CREATE TABLE spike_offline.state (
  tenant_id uuid PRIMARY KEY,
  sheet_locked boolean NOT NULL DEFAULT false,
  session_expired boolean NOT NULL DEFAULT false
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cells', 'applied_operations', 'conflicts', 'state'] LOOP
    EXECUTE format('ALTER TABLE spike_offline.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE spike_offline.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON spike_offline.%I FOR ALL '
      'USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) '
      'WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON spike_offline.cells TO akoso_app;
-- UPDATE: the operation ID is claimed first, then its outcome recorded in the same
-- transaction.
GRANT SELECT, INSERT, UPDATE ON spike_offline.applied_operations TO akoso_app;
GRANT SELECT, INSERT ON spike_offline.conflicts TO akoso_app;
GRANT SELECT, INSERT, UPDATE ON spike_offline.state TO akoso_app;

RESET ROLE;
