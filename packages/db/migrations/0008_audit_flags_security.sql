-- The audit hash chain, its verification, grants and RLS for the audit, flag and
-- settings tables (spec: docs/specs/stage-1-time-audit-flags.md). Hand-written.

-- One record's hash: SHA-256 of its content and the previous record's hash. The text is
-- built field by field in a fixed order; jsonb's text form is itself canonical.
CREATE FUNCTION "platform"."audit_event_hash"(
  p_tenant_id uuid, p_seq bigint, p_occurred_at timestamptz, p_actor text,
  p_action text, p_entity_type text, p_entity_id text, p_changes jsonb,
  p_request_id text, p_prev_hash text
) RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT encode(sha256(convert_to(concat_ws(E'\x1f',
    p_tenant_id::text, p_seq::text,
    to_char(p_occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    p_actor, p_action, p_entity_type, p_entity_id, p_changes::text,
    coalesce(p_request_id, ''), p_prev_hash
  ), 'UTF8')), 'hex')
$$;
--> statement-breakpoint

-- Before each insert: take the school's chain head (locked, so concurrent writes queue),
-- set the next sequence number, the time and the hashes, and move the head on. Runs as
-- the tables' owner, so the app role needs no access to the head at all. Whatever the
-- application sent for these fields is replaced.
CREATE FUNCTION "platform"."audit_events_chain"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_seq bigint;
  v_prev text;
BEGIN
  INSERT INTO platform.audit_chain_heads (tenant_id, last_seq, last_hash)
  VALUES (NEW.tenant_id, 0, repeat('0', 64))
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT last_seq, last_hash INTO v_seq, v_prev
  FROM platform.audit_chain_heads
  WHERE tenant_id = NEW.tenant_id
  FOR UPDATE;

  NEW.seq := v_seq + 1;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash := v_prev;
  NEW.hash := platform.audit_event_hash(
    NEW.tenant_id, NEW.seq, NEW.occurred_at, NEW.actor, NEW.action,
    NEW.entity_type, NEW.entity_id, NEW.changes, NEW.request_id, NEW.prev_hash
  );

  UPDATE platform.audit_chain_heads
  SET last_seq = NEW.seq, last_hash = NEW.hash
  WHERE tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_events_chain"
  BEFORE INSERT ON "platform"."audit_events"
  FOR EACH ROW EXECUTE FUNCTION "platform"."audit_events_chain"();
--> statement-breakpoint

-- Recomputes a school's chain. Returns the first broken record and why, or no rows when
-- the chain is whole: every sequence number present in order, every record pointing at
-- the previous hash, every hash matching its content, and the head matching the last
-- record (so a deleted newest record is caught too).
CREATE FUNCTION "platform"."verify_audit_chain"(p_tenant_id uuid)
RETURNS TABLE (broken_seq bigint, reason text)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  r record;
  v_expected_seq bigint := 1;
  v_prev text := repeat('0', 64);
  v_head_seq bigint;
  v_head_hash text;
BEGIN
  FOR r IN
    SELECT * FROM platform.audit_events WHERE tenant_id = p_tenant_id ORDER BY seq
  LOOP
    IF r.seq <> v_expected_seq THEN
      RETURN QUERY SELECT v_expected_seq, 'missing record'::text;
      RETURN;
    END IF;
    IF r.prev_hash <> v_prev THEN
      RETURN QUERY SELECT r.seq, 'does not follow the previous record'::text;
      RETURN;
    END IF;
    IF r.hash <> platform.audit_event_hash(
      r.tenant_id, r.seq, r.occurred_at, r.actor, r.action, r.entity_type,
      r.entity_id, r.changes, r.request_id, r.prev_hash
    ) THEN
      RETURN QUERY SELECT r.seq, 'content changed'::text;
      RETURN;
    END IF;
    v_prev := r.hash;
    v_expected_seq := r.seq + 1;
  END LOOP;

  SELECT last_seq, last_hash INTO v_head_seq, v_head_hash
  FROM platform.audit_chain_heads WHERE tenant_id = p_tenant_id;
  IF v_head_seq IS NOT NULL AND (v_head_seq <> v_expected_seq - 1 OR v_head_hash <> v_prev) THEN
    RETURN QUERY SELECT v_expected_seq, 'newest records missing'::text;
  END IF;
END;
$$;
--> statement-breakpoint

-- Audit records: a tenant table, RLS enabled and forced. The app role may write and
-- read its own school's records, and never change or remove one.
ALTER TABLE "platform"."audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."audit_events"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- The owner reads every school's records, for verify_audit_chain() only.
CREATE POLICY "owner_verifies" ON "platform"."audit_events"
  FOR SELECT TO akoso_migrator USING (true);
--> statement-breakpoint
GRANT SELECT, INSERT ON "platform"."audit_events" TO akoso_app;
--> statement-breakpoint

-- Chain heads: keyed by school, so a tenant table too, but the app role has no access;
-- only the trigger (as the owner) reads and moves them.
ALTER TABLE "platform"."audit_chain_heads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."audit_chain_heads" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."audit_chain_heads"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "owner_moves_heads" ON "platform"."audit_chain_heads"
  FOR ALL TO akoso_migrator USING (true) WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL ON "platform"."audit_chain_heads" FROM PUBLIC;
--> statement-breakpoint

REVOKE ALL ON FUNCTION "platform"."audit_events_chain"() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."verify_audit_chain"(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."verify_audit_chain"(uuid) TO akoso_app;
--> statement-breakpoint

-- Feature flag overrides: a tenant table the app role may read, never change.
ALTER TABLE "platform"."tenant_feature_flags"
  ADD CONSTRAINT "tenant_feature_flags_key_check"
  CHECK ("flag_key" ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$');
--> statement-breakpoint
ALTER TABLE "platform"."tenant_feature_flags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."tenant_feature_flags" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."tenant_feature_flags"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT ON "platform"."tenant_feature_flags" TO akoso_app;
--> statement-breakpoint

-- Platform settings: read-only for the app role.
ALTER TABLE "platform"."platform_settings"
  ADD CONSTRAINT "platform_settings_key_check"
  CHECK ("key" ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$');
--> statement-breakpoint
GRANT SELECT ON "platform"."platform_settings" TO akoso_app;
