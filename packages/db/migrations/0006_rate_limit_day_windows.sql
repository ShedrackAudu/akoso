-- Allow rate-limit windows of up to a day, for the per-number daily cap on sign-in codes
-- (spec: docs/specs/stage-1-sign-in.md, section 7). Otherwise unchanged from 0001.
CREATE OR REPLACE FUNCTION "platform"."hit_rate_limit"(p_bucket text, p_window_seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400
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

  -- Earlier windows for this bucket are no longer needed.
  DELETE FROM platform.rate_limit_windows
  WHERE bucket = p_bucket AND window_start < v_window;

  RETURN v_count;
END;
$$;
