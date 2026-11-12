-- Row-level security, grants and the rate-limit function for the kernel tables
-- (spec: stage-1-api-and-service-conventions.md). Hand-written: Drizzle cannot express
-- FORCE ROW LEVEL SECURITY, UNLOGGED tables or SECURITY DEFINER functions.

-- Only a finished or running request is valid.
ALTER TABLE "platform"."idempotency_keys"
  ADD CONSTRAINT "idempotency_keys_state_check" CHECK ("state" IN ('running', 'done'));
--> statement-breakpoint

-- A tenant table: RLS enabled and forced, so even the table's owner is filtered.
-- `nullif` turns an unset tenant (an empty string) into NULL, which matches no row.
ALTER TABLE "platform"."idempotency_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."idempotency_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."idempotency_keys"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform"."idempotency_keys" TO akoso_app;
--> statement-breakpoint
-- The table's owner, the migration role, would otherwise see nothing either (RLS is
-- forced). It may reach expired rows only, which is all the cleanup function needs.
CREATE POLICY "purge_expired" ON "platform"."idempotency_keys"
  FOR ALL TO akoso_migrator
  USING ("created_at" < now() - interval '24 hours');
--> statement-breakpoint

-- Counts need not survive a crash, so skip the write-ahead log.
ALTER TABLE "platform"."rate_limit_windows" SET UNLOGGED;
--> statement-breakpoint
-- The app role has no direct access to the counts at all.
REVOKE ALL ON "platform"."rate_limit_windows" FROM PUBLIC;
--> statement-breakpoint

-- Counts one request against a bucket and returns the count so far in the current
-- window. Runs as the table's owner (SECURITY DEFINER) with a fixed search path, so
-- the app role can count but never read, change or delete anyone's counts.
CREATE FUNCTION "platform"."hit_rate_limit"(p_bucket text, p_window_seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 3600
     OR p_bucket IS NULL OR length(p_bucket) > 128 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;
  v_window := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO platform.rate_limit_windows AS w (bucket, window_start, count)
  VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET count = w.count + 1
  RETURNING w.count INTO v_count;

  -- Old windows for this bucket are no longer needed.
  DELETE FROM platform.rate_limit_windows
  WHERE bucket = p_bucket AND window_start < v_window - interval '10 minutes';

  RETURN v_count;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."hit_rate_limit"(text, integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."hit_rate_limit"(text, integer) TO akoso_app;
--> statement-breakpoint

-- Removes idempotency keys older than 24 hours, for every school. Run by the worker's
-- cleanup job; until the worker exists, by the test set-up. SECURITY DEFINER because
-- the cleanup spans schools, which RLS would otherwise hide.
CREATE FUNCTION "platform"."purge_expired_idempotency_keys"()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM platform.idempotency_keys WHERE created_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."purge_expired_idempotency_keys"() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."purge_expired_idempotency_keys"() TO akoso_app;
