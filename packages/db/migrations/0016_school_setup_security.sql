-- School setup part A: checks, row-level security and grants for the school_setup
-- schema (spec: docs/specs/stage-2-school-setup-a.md). Hand-written.

GRANT USAGE ON SCHEMA "school_setup" TO akoso_app;
--> statement-breakpoint
-- Checks: the use cases validate first and explain; these are the backstop.
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles"
  ADD CONSTRAINT "school_profiles_types_check"
  CHECK (cardinality("school_types") >= 1
    AND "school_types" <@ ARRAY['nursery', 'primary', 'secondary']::text[]);
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles"
  ADD CONSTRAINT "school_profiles_lengths_check"
  CHECK (length("motto") <= 200 AND length("address") <= 500 AND length("lga") <= 100);
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles"
  ADD CONSTRAINT "school_profiles_phone_check"
  CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles"
  ADD CONSTRAINT "school_profiles_email_check"
  CHECK ("email" IS NULL OR ("email" = lower("email") AND "email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles"
  ADD CONSTRAINT "school_profiles_brand_colour_check"
  CHECK ("brand_colour" IS NULL OR "brand_colour" ~ '^#[0-9a-f]{6}$');
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions"
  ADD CONSTRAINT "academic_sessions_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 40);
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions"
  ADD CONSTRAINT "academic_sessions_status_check"
  CHECK ("status" IN ('planned', 'current', 'closed'));
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions"
  ADD CONSTRAINT "academic_sessions_dates_check"
  CHECK ("ends_on" > "starts_on");
--> statement-breakpoint
ALTER TABLE "school_setup"."terms"
  ADD CONSTRAINT "terms_number_check"
  CHECK ("number" BETWEEN 1 AND 3);
--> statement-breakpoint
ALTER TABLE "school_setup"."terms"
  ADD CONSTRAINT "terms_dates_check"
  CHECK ("ends_on" >= "starts_on");
--> statement-breakpoint
ALTER TABLE "school_setup"."terms"
  ADD CONSTRAINT "terms_mid_term_check"
  CHECK (("mid_term_starts_on" IS NULL) = ("mid_term_ends_on" IS NULL)
    AND ("mid_term_starts_on" IS NULL OR (
      "mid_term_starts_on" <= "mid_term_ends_on"
      AND "mid_term_starts_on" >= "starts_on" AND "mid_term_ends_on" <= "ends_on")));
--> statement-breakpoint
ALTER TABLE "school_setup"."terms"
  ADD CONSTRAINT "terms_resumes_check"
  CHECK ("resumes_on" IS NULL OR "resumes_on" > "ends_on");
--> statement-breakpoint
ALTER TABLE "school_setup"."non_school_days"
  ADD CONSTRAINT "non_school_days_dates_check"
  CHECK ("ends_on" >= "starts_on");
--> statement-breakpoint
ALTER TABLE "school_setup"."non_school_days"
  ADD CONSTRAINT "non_school_days_reason_check"
  CHECK ("reason" IN ('public_holiday', 'closure', 'other') AND length("note") <= 200);
--> statement-breakpoint
ALTER TABLE "school_setup"."levels"
  ADD CONSTRAINT "levels_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 60);
--> statement-breakpoint
ALTER TABLE "school_setup"."levels"
  ADD CONSTRAINT "levels_stage_check"
  CHECK ("stage" IN ('nursery', 'primary', 'junior', 'senior'));
--> statement-breakpoint
ALTER TABLE "school_setup"."classes"
  ADD CONSTRAINT "classes_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 60);
--> statement-breakpoint
ALTER TABLE "school_setup"."classes"
  ADD CONSTRAINT "classes_standard_class_check"
  CHECK ("standard_class" IS NULL OR "standard_class" ~ '^[a-z][a-z0-9_]*$');
--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms"
  ADD CONSTRAINT "class_arms_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 40);
--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms"
  ADD CONSTRAINT "class_arms_curriculum_check"
  CHECK ("curriculum" IN ('nerdc_2025', 'nerdc_pre2025', 'own'));
--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms"
  ADD CONSTRAINT "class_arms_track_check"
  CHECK ("track" IS NULL OR "track" IN ('science', 'humanities', 'business', 'technology'));
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects"
  ADD CONSTRAINT "subjects_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 80);
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects"
  ADD CONSTRAINT "subjects_code_check"
  CHECK ("code" ~ '^[A-Z0-9]{2,8}$');
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects"
  ADD CONSTRAINT "subjects_kind_check"
  CHECK ("kind" IN ('core', 'elective', 'trade', 'optional'));
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects"
  ADD CONSTRAINT "subjects_nerdc_key_check"
  CHECK ("nerdc_key" IS NULL OR "nerdc_key" ~ '^[a-z][a-z0-9_]*$');
--> statement-breakpoint
-- One current session per school at a time.
CREATE UNIQUE INDEX "academic_sessions_one_current"
  ON "school_setup"."academic_sessions" ("tenant_id") WHERE "status" = 'current';
--> statement-breakpoint
-- Class and arm names are unique among the ones still in use.
CREATE UNIQUE INDEX "classes_tenant_name_live"
  ON "school_setup"."classes" ("tenant_id", lower("name")) WHERE "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "class_arms_tenant_class_name_live"
  ON "school_setup"."class_arms" ("tenant_id", "class_id", lower("name"))
  WHERE "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_tenant_name_live"
  ON "school_setup"."subjects" ("tenant_id", lower("name")) WHERE "archived_at" IS NULL;
--> statement-breakpoint
-- Every table belongs to one school: RLS enabled and forced. Nothing is ever hard-
-- deleted except non-school days and arm subjects; the rest are archived.
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."school_profiles"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."school_profiles" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."academic_sessions"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."academic_sessions" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."terms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."terms" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."terms"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_setup"."terms" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."non_school_days" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."non_school_days" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."non_school_days"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_setup"."non_school_days" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."levels" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."levels" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."levels"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."levels" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."classes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."classes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."classes"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."classes" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."class_arms"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."class_arms" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."subjects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."subjects"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "school_setup"."subjects" TO akoso_app;
--> statement-breakpoint
ALTER TABLE "school_setup"."arm_subjects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "school_setup"."arm_subjects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "school_setup"."arm_subjects"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "school_setup"."arm_subjects" TO akoso_app;
--> statement-breakpoint
-- The school's name and time zone stay on platform.tenants, which the app role cannot
-- write. This changes only those two, only for the transaction's own school, and runs
-- as the owner with a fixed search path. The slug is never changed here (open
-- question 4: Akoso support changes it).
CREATE FUNCTION "platform"."update_school_identity"(p_name text, p_time_zone text)
RETURNS TABLE (name text, time_zone text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_tenant uuid := nullif(current_setting('app.tenant_id', true), '')::uuid;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'no school in this transaction' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = p_time_zone) THEN
    RAISE EXCEPTION 'unknown time zone' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  UPDATE platform.tenants t
  SET name = btrim(p_name), time_zone = p_time_zone, updated_at = now()
  WHERE t.id = v_tenant
  RETURNING t.name, t.time_zone;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."update_school_identity"(text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."update_school_identity"(text, text) TO akoso_app;
