-- Checks, grants and the team audit chain for Akoso team sign-in
-- (spec: docs/specs/stage-1-sign-in-part-b.md, section 8). Hand-written.

ALTER TABLE "platform"."team_users"
  ADD CONSTRAINT "team_users_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 200);
--> statement-breakpoint
ALTER TABLE "platform"."team_users"
  ADD CONSTRAINT "team_users_email_check" CHECK ("email" = lower("email") AND "email" LIKE '%_@_%');
--> statement-breakpoint
ALTER TABLE "platform"."team_role_grants"
  ADD CONSTRAINT "team_role_grants_role_check"
  CHECK ("role" IN ('owner', 'support', 'onboarding', 'finance', 'sales', 'ops'));
--> statement-breakpoint
ALTER TABLE "platform"."team_security_events"
  ADD CONSTRAINT "team_security_events_kind_check"
  CHECK ("kind" IN ('sign_in', 'enrolled', 'passkey_added', 'passkey_removed',
    'recovery_code_used', 'recovery_codes_created', 'roles_changed', 'access_removed',
    'sessions_revoked'));
--> statement-breakpoint
ALTER TABLE "platform"."team_audit_chain_head"
  ADD CONSTRAINT "team_audit_chain_head_single_row" CHECK ("id" = 1);
--> statement-breakpoint

-- The team's sign-in tables: the app role runs the team's Better Auth instance.
-- Only the team module uses them; a boundary rule keeps the school app away.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "platform"."team_users", "platform"."team_sessions", "platform"."team_verifications",
  "platform"."team_passkeys", "platform"."team_role_grants",
  "platform"."team_invitations", "platform"."team_recovery_codes"
  TO akoso_app;
--> statement-breakpoint
-- Security events are append-only: insert and read, never change or remove.
GRANT SELECT, INSERT ON "platform"."team_security_events" TO akoso_app;
--> statement-breakpoint

-- The team audit chain: one chain, the same hash as a school's (item 6) with an
-- all-zero ID in place of a school's. The head is reachable only by the trigger.
INSERT INTO "platform"."team_audit_chain_head" ("id", "last_seq", "last_hash")
VALUES (1, 0, repeat('0', 64));
--> statement-breakpoint
CREATE FUNCTION "platform"."team_audit_events_chain"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_seq bigint;
  v_prev text;
BEGIN
  SELECT last_seq, last_hash INTO v_seq, v_prev
  FROM platform.team_audit_chain_head WHERE id = 1 FOR UPDATE;

  NEW.seq := v_seq + 1;
  NEW.occurred_at := clock_timestamp();
  NEW.prev_hash := v_prev;
  NEW.hash := platform.audit_event_hash(
    '00000000-0000-0000-0000-000000000000'::uuid, NEW.seq, NEW.occurred_at,
    NEW.actor, NEW.action, NEW.entity_type, NEW.entity_id, NEW.changes,
    NEW.request_id, NEW.prev_hash
  );

  UPDATE platform.team_audit_chain_head
  SET last_seq = NEW.seq, last_hash = NEW.hash WHERE id = 1;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "team_audit_events_chain"
  BEFORE INSERT ON "platform"."team_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "platform"."team_audit_events_chain"();
--> statement-breakpoint

-- Recomputes the team chain: the first broken record and why, or no rows when whole.
CREATE FUNCTION "platform"."verify_team_audit_chain"()
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
  FOR r IN SELECT * FROM platform.team_audit_events ORDER BY seq LOOP
    IF r.seq <> v_expected_seq THEN
      RETURN QUERY SELECT v_expected_seq, 'missing record'::text;
      RETURN;
    END IF;
    IF r.prev_hash <> v_prev THEN
      RETURN QUERY SELECT r.seq, 'does not follow the previous record'::text;
      RETURN;
    END IF;
    IF r.hash <> platform.audit_event_hash(
      '00000000-0000-0000-0000-000000000000'::uuid, r.seq, r.occurred_at, r.actor,
      r.action, r.entity_type, r.entity_id, r.changes, r.request_id, r.prev_hash
    ) THEN
      RETURN QUERY SELECT r.seq, 'content changed'::text;
      RETURN;
    END IF;
    v_prev := r.hash;
    v_expected_seq := r.seq + 1;
  END LOOP;

  SELECT last_seq, last_hash INTO v_head_seq, v_head_hash
  FROM platform.team_audit_chain_head WHERE id = 1;
  IF v_head_seq <> v_expected_seq - 1 OR v_head_hash <> v_prev THEN
    RETURN QUERY SELECT v_expected_seq, 'newest records missing'::text;
  END IF;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."verify_team_audit_chain"() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."verify_team_audit_chain"() TO akoso_app;
--> statement-breakpoint
-- Team audit records: the app role may write and read them, never change or remove one.
GRANT SELECT, INSERT ON "platform"."team_audit_events" TO akoso_app;
