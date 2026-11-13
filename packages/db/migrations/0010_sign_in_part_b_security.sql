-- Checks, grants, RLS and functions for sign-in part B
-- (spec: docs/specs/stage-1-sign-in-part-b.md). Hand-written: Drizzle cannot express these.

-- A membership can now end for good (the person deleted their account).
ALTER TABLE "platform"."memberships" DROP CONSTRAINT "memberships_status_check";
--> statement-breakpoint
ALTER TABLE "platform"."memberships"
  ADD CONSTRAINT "memberships_status_check"
  CHECK ("status" IN ('active', 'suspended', 'ended'));
--> statement-breakpoint
ALTER TABLE "platform"."memberships"
  ADD CONSTRAINT "memberships_ended_check"
  CHECK (("status" = 'ended') = ("ended_at" IS NOT NULL));
--> statement-breakpoint

ALTER TABLE "platform"."security_events" DROP CONSTRAINT "security_events_kind_check";
--> statement-breakpoint
ALTER TABLE "platform"."security_events"
  ADD CONSTRAINT "security_events_kind_check"
  CHECK ("kind" IN ('sign_in', 'sign_in_failed', 'code_sent', 'account_locked',
    'mfa_enabled', 'mfa_disabled', 'password_changed', 'password_reset',
    'sessions_revoked',
    -- Part B.
    'roles_changed', 'membership_suspended', 'membership_reactivated',
    'membership_ended', 'phone_changed', 'backup_phone_added', 'backup_phone_removed',
    'mfa_reset', 'email_changed', 'profile_changed', 'account_deleted'));
--> statement-breakpoint

ALTER TABLE "platform"."user_backup_phones"
  ADD CONSTRAINT "user_backup_phones_phone_number_check"
  CHECK ("phone_number" ~ '^\+[1-9][0-9]{6,14}$');
--> statement-breakpoint

ALTER TABLE "platform"."custom_roles"
  ADD CONSTRAINT "custom_roles_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 60);
--> statement-breakpoint
ALTER TABLE "platform"."custom_roles"
  ADD CONSTRAINT "custom_roles_description_check" CHECK (length("description") <= 300);
--> statement-breakpoint
ALTER TABLE "platform"."custom_roles"
  ADD CONSTRAINT "custom_roles_permissions_check" CHECK (cardinality("permissions") <= 200);
--> statement-breakpoint
-- Names are unique in a school, ignoring case ("Exams officer" and "exams officer").
CREATE UNIQUE INDEX "custom_roles_tenant_name_unique"
  ON "platform"."custom_roles" ("tenant_id", lower(btrim("name")));
--> statement-breakpoint

ALTER TABLE "platform"."contact_changes"
  ADD CONSTRAINT "contact_changes_values_check" CHECK (
    "kind" IN ('phone_number', 'mfa_reset')
    AND "check_method" IN ('in_person', 'video_call')
    AND "evidence" IN ('parent_id', 'child_details', 'staff_id', 'other')
    AND "reason" IN ('sim_lost', 'number_changed', 'authenticator_lost', 'other')
    AND "status" IN ('pending', 'done', 'cancelled')
    AND length("note") <= 300
    AND ("new_number_ending" IS NULL OR "new_number_ending" ~ '^[0-9]{3}$'));
--> statement-breakpoint

-- A number belongs to one account only, as its main or its backup number. Both tables
-- check the other; the advisory lock makes two inserts of one number queue.
CREATE FUNCTION "platform"."phone_number_is_free"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF NEW.phone_number IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('phone:' || NEW.phone_number));
  IF TG_TABLE_NAME = 'users' THEN
    SELECT b.user_id INTO v_owner FROM platform.user_backup_phones b
    WHERE b.phone_number = NEW.phone_number;
  ELSE
    SELECT u.id INTO v_owner FROM platform.users u
    WHERE u.phone_number = NEW.phone_number;
  END IF;
  -- Another account's number, or this person's other number: either way, refused.
  IF v_owner IS NOT NULL THEN
    RAISE EXCEPTION 'phone number already in use' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "users_phone_number_is_free"
  BEFORE INSERT OR UPDATE OF "phone_number" ON "platform"."users"
  FOR EACH ROW EXECUTE FUNCTION "platform"."phone_number_is_free"();
--> statement-breakpoint
CREATE TRIGGER "user_backup_phones_phone_number_is_free"
  BEFORE INSERT OR UPDATE OF "phone_number" ON "platform"."user_backup_phones"
  FOR EACH ROW EXECUTE FUNCTION "platform"."phone_number_is_free"();
--> statement-breakpoint

-- Backup numbers are sign-in data, like users: the app role only, no RLS by school.
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform"."user_backup_phones" TO akoso_app;
--> statement-breakpoint

-- The school's own tables: RLS enabled and forced, one policy each, and read-only
-- access for the tables' owner, which runs the lookup functions below.
ALTER TABLE "platform"."custom_roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."custom_roles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."custom_roles"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "owner_reads_for_lookup" ON "platform"."custom_roles"
  FOR SELECT TO akoso_migrator USING (true);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform"."custom_roles" TO akoso_app;
--> statement-breakpoint

ALTER TABLE "platform"."membership_custom_roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."membership_custom_roles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."membership_custom_roles"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "owner_reads_for_lookup" ON "platform"."membership_custom_roles"
  FOR SELECT TO akoso_migrator USING (true);
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "platform"."membership_custom_roles" TO akoso_app;
--> statement-breakpoint

ALTER TABLE "platform"."school_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."school_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."school_settings"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY "owner_reads_for_lookup" ON "platform"."school_settings"
  FOR SELECT TO akoso_migrator USING (true);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "platform"."school_settings" TO akoso_app;
--> statement-breakpoint

ALTER TABLE "platform"."contact_changes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."contact_changes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."contact_changes"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- A record of an identity check is kept: no deletes.
GRANT SELECT, INSERT, UPDATE ON "platform"."contact_changes" TO akoso_app;
--> statement-breakpoint

-- The memberships owner may now end memberships, through end_memberships_of_deleted_user()
-- only.
CREATE POLICY "owner_ends_deleted_users" ON "platform"."memberships"
  FOR UPDATE TO akoso_migrator USING (true) WITH CHECK ("status" = 'ended');
--> statement-breakpoint

-- schools_for_user() now also gives each membership's ID, its custom roles'
-- permissions, whether one of them needs a second step (null: no custom role), and
-- which built-in roles the
-- school has said must use one. Still one person's active memberships only.
DROP FUNCTION "platform"."schools_for_user"(uuid);
--> statement-breakpoint
CREATE FUNCTION "platform"."schools_for_user"(p_user_id uuid)
RETURNS TABLE (
  id uuid, slug text, name text, status text, time_zone text, roles text[],
  membership_id uuid, custom_permissions text[], custom_requires_mfa boolean,
  school_mfa_roles text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.id, t.slug, t.name, t.status, t.time_zone, m.roles, m.id,
    coalesce((
      SELECT array_agg(DISTINCT p ORDER BY p)
      FROM platform.membership_custom_roles mc
      JOIN platform.custom_roles r
        ON r.id = mc.custom_role_id AND r.tenant_id = mc.tenant_id
      CROSS JOIN LATERAL unnest(r.permissions) AS p
      WHERE mc.tenant_id = m.tenant_id AND mc.membership_id = m.id
    ), '{}'::text[]),
    -- Null when the person holds no custom role in this school.
    (
      SELECT bool_or(r.requires_mfa)
      FROM platform.membership_custom_roles mc
      JOIN platform.custom_roles r
        ON r.id = mc.custom_role_id AND r.tenant_id = mc.tenant_id
      WHERE mc.tenant_id = m.tenant_id AND mc.membership_id = m.id
    ),
    coalesce((
      SELECT array(SELECT jsonb_array_elements_text(s.value))
      FROM platform.school_settings s
      WHERE s.tenant_id = t.id AND s.key = 'security.mfa_roles'
        AND jsonb_typeof(s.value) = 'array'
    ), '{}'::text[])
  FROM platform.memberships m
  JOIN platform.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id AND m.status = 'active' AND t.status <> 'closed'
  ORDER BY t.name
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."schools_for_user"(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."schools_for_user"(uuid) TO akoso_app;
--> statement-breakpoint

-- The proprietor's security log (spec section 3). The school comes from the request's
-- tenant setting, never a parameter. It shows every event a school caused, and the
-- account events (caused_by_school_id null) of people who work for the school: a membership there
-- with a role other than guardian, or with a custom role. Guardians' own sign-ins are
-- not shown. Newest first; pass the last row's time and ID for the next page.
CREATE FUNCTION "platform"."school_security_log"(
  p_limit integer,
  p_before_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_failures_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid, created_at timestamptz, user_id uuid, user_name text, kind text,
  detail text, ip_address text, user_agent text, caused_by_school boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  WITH school AS (
    SELECT nullif(current_setting('app.tenant_id', true), '')::uuid AS id
  ),
  staff AS (
    SELECT m.user_id
    FROM platform.memberships m, school
    WHERE m.tenant_id = school.id
      AND (EXISTS (SELECT 1 FROM unnest(m.roles) AS r WHERE r <> 'guardian')
        OR EXISTS (SELECT 1 FROM platform.membership_custom_roles mc
                   WHERE mc.tenant_id = m.tenant_id AND mc.membership_id = m.id))
  )
  SELECT e.id, e.created_at, e.user_id, u.name, e.kind, e.detail, e.ip_address,
         e.user_agent, e.caused_by_school_id IS NOT NULL
  FROM platform.security_events e
  CROSS JOIN school
  LEFT JOIN platform.users u ON u.id = e.user_id
  WHERE school.id IS NOT NULL
    AND (e.caused_by_school_id = school.id
      OR (e.caused_by_school_id IS NULL AND e.user_id IN (SELECT user_id FROM staff)))
    AND (p_user_id IS NULL OR e.user_id = p_user_id)
    AND (NOT p_failures_only
      OR e.kind IN ('sign_in_failed', 'account_locked'))
    AND (p_before_at IS NULL OR (e.created_at, e.id) < (p_before_at, p_before_id))
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT least(greatest(p_limit, 1), 200)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."school_security_log"(integer, timestamptz, uuid, uuid, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."school_security_log"(integer, timestamptz, uuid, uuid, boolean) TO akoso_app;
--> statement-breakpoint

-- Ends every membership of a person who has deleted their account (spec section 7),
-- across schools, and returns the schools so each can record it in its audit log. It
-- refuses for anyone whose account is not already marked deleted, so it cannot be used
-- to remove a living person from their schools.
CREATE FUNCTION "platform"."end_memberships_of_deleted_user"(p_user_id uuid)
RETURNS TABLE (tenant_id uuid, membership_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform.users u
                 WHERE u.id = p_user_id AND u.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'account is not deleted' USING ERRCODE = 'check_violation';
  END IF;
  RETURN QUERY
  UPDATE platform.memberships m
  SET status = 'ended', ended_at = now(), ended_reason = 'account_deleted',
      updated_at = now()
  WHERE m.user_id = p_user_id AND m.status <> 'ended'
  RETURNING m.tenant_id, m.id;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."end_memberships_of_deleted_user"(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."end_memberships_of_deleted_user"(uuid) TO akoso_app;
