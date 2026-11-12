-- Checks, grants, RLS and the lookup function for the identity tables
-- (spec: docs/specs/stage-1-sign-in.md). Hand-written: Drizzle cannot express these.

-- Roles are the keys in docs/permissions.md. Part B (custom roles) widens this.
ALTER TABLE "platform"."memberships"
  ADD CONSTRAINT "memberships_roles_check"
  CHECK (cardinality("roles") >= 1 AND "roles" <@ ARRAY[
    'group_owner', 'proprietor', 'school_admin', 'bursar', 'head_teacher',
    'vice_principal', 'safeguarding_lead', 'nurse', 'accountant', 'teacher',
    'gate_staff', 'guardian'
  ]::text[]);
--> statement-breakpoint
ALTER TABLE "platform"."memberships"
  ADD CONSTRAINT "memberships_status_check" CHECK ("status" IN ('active', 'suspended'));
--> statement-breakpoint
ALTER TABLE "platform"."users"
  ADD CONSTRAINT "users_phone_number_check"
  CHECK ("phone_number" IS NULL OR "phone_number" ~ '^\+[1-9][0-9]{6,14}$');
--> statement-breakpoint
ALTER TABLE "platform"."users"
  ADD CONSTRAINT "users_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 200);
--> statement-breakpoint
ALTER TABLE "platform"."security_events"
  ADD CONSTRAINT "security_events_kind_check"
  CHECK ("kind" IN ('sign_in', 'sign_in_failed', 'code_sent', 'account_locked',
    'mfa_enabled', 'mfa_disabled', 'password_changed', 'password_reset',
    'sessions_revoked'));
--> statement-breakpoint

-- Sign-in tables: the app role runs Better Auth, so it reads and writes them. No other
-- role does. Nothing here belongs to one school, so there is no RLS by school.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "platform"."users", "platform"."user_credentials", "platform"."sessions",
  "platform"."verifications", "platform"."two_factors"
  TO akoso_app;
--> statement-breakpoint

-- Security events are append-only: insert and read, never change or remove.
GRANT SELECT, INSERT ON "platform"."security_events" TO akoso_app;
--> statement-breakpoint

-- Memberships belong to a school: a tenant table, RLS enabled and forced.
ALTER TABLE "platform"."memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."memberships"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- The table's owner runs schools_for_user() below, which reads across schools for one
-- person only. Read-only; it cannot change memberships.
CREATE POLICY "owner_reads_for_lookup" ON "platform"."memberships"
  FOR SELECT TO akoso_migrator
  USING (true);
--> statement-breakpoint
-- Leaving a school is a status change, never a delete.
GRANT SELECT, INSERT, UPDATE ON "platform"."memberships" TO akoso_app;
--> statement-breakpoint

-- One person's active memberships in schools that are not closed, with each school's
-- public summary and the person's roles there. Used by the school picker and to work
-- out which sign-in rules apply to a person. It returns nobody else's memberships.
CREATE FUNCTION "platform"."schools_for_user"(p_user_id uuid)
RETURNS TABLE (id uuid, slug text, name text, status text, time_zone text, roles text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.id, t.slug, t.name, t.status, t.time_zone, m.roles
  FROM platform.memberships m
  JOIN platform.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id AND m.status = 'active' AND t.status <> 'closed'
  ORDER BY t.name
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."schools_for_user"(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."schools_for_user"(uuid) TO akoso_app;
