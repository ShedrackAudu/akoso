-- Checks, grants, RLS and the school lookup functions for the tenancy tables
-- (spec: docs/specs/stage-1-tenancy.md). Hand-written: Drizzle cannot express these.

-- A slug: lower-case letters, digits and single hyphens, 3 to 40 characters, not
-- starting or ending with a hyphen. The reserved list is enforced in code (it changes
-- more often than the schema should).
ALTER TABLE "platform"."tenants"
  ADD CONSTRAINT "tenants_slug_check"
  CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") BETWEEN 3 AND 40);
--> statement-breakpoint
ALTER TABLE "platform"."tenants"
  ADD CONSTRAINT "tenants_status_check"
  CHECK ("status" IN ('onboarding', 'active', 'suspended', 'read_only', 'closed'));
--> statement-breakpoint
ALTER TABLE "platform"."tenants"
  ADD CONSTRAINT "tenants_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 200);
--> statement-breakpoint
ALTER TABLE "platform"."groups"
  ADD CONSTRAINT "groups_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 200);
--> statement-breakpoint
ALTER TABLE "platform"."tenant_domains"
  ADD CONSTRAINT "tenant_domains_status_check"
  CHECK ("status" IN ('pending_dns', 'verifying', 'active', 'failing', 'removed'));
--> statement-breakpoint
-- Stored lower-case, as a hostname with at least one dot and no scheme, port or path.
ALTER TABLE "platform"."tenant_domains"
  ADD CONSTRAINT "tenant_domains_hostname_check"
  CHECK ("hostname" = lower("hostname")
     AND "hostname" ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
     AND length("hostname") <= 253);
--> statement-breakpoint

-- Groups and schools describe schools; they belong to none. The app role gets no direct
-- access at all, only the lookup functions below.
REVOKE ALL ON "platform"."groups", "platform"."tenants" FROM PUBLIC;
--> statement-breakpoint

-- A school's domains belong to that school: a tenant table, RLS enabled and forced.
ALTER TABLE "platform"."tenant_domains" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform"."tenant_domains" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "platform"."tenant_domains"
  FOR ALL TO akoso_app
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- The table's owner (the migration role) runs the routing lookup; it may see active
-- domains only.
CREATE POLICY "routing_reads_active" ON "platform"."tenant_domains"
  FOR SELECT TO akoso_migrator
  USING ("status" = 'active');
--> statement-breakpoint
-- Read-only for now: adding and verifying domains comes with the custom-domains slice.
GRANT SELECT ON "platform"."tenant_domains" TO akoso_app;
--> statement-breakpoint

-- Idempotency keys belong to a real school. The table holds only short-lived keys, and
-- nothing has been deployed yet, so it is emptied rather than back-filled.
TRUNCATE "platform"."idempotency_keys";
--> statement-breakpoint
ALTER TABLE "platform"."idempotency_keys"
  ADD CONSTRAINT "idempotency_keys_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id");
--> statement-breakpoint

-- School lookups for routing and request checks. They return only what a public page
-- or the request pipeline needs, never the whole row, and run as the tables' owner with
-- a fixed search path. The app role may call them; it cannot read the tables.
CREATE FUNCTION "platform"."tenant_by_slug"(p_slug text)
RETURNS TABLE (id uuid, slug text, name text, status text, time_zone text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.id, t.slug, t.name, t.status, t.time_zone
  FROM platform.tenants t
  WHERE t.slug = lower(p_slug)
$$;
--> statement-breakpoint
CREATE FUNCTION "platform"."tenant_by_id"(p_id uuid)
RETURNS TABLE (id uuid, slug text, name text, status text, time_zone text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.id, t.slug, t.name, t.status, t.time_zone
  FROM platform.tenants t
  WHERE t.id = p_id
$$;
--> statement-breakpoint
CREATE FUNCTION "platform"."tenant_by_host"(p_host text)
RETURNS TABLE (id uuid, slug text, name text, status text, time_zone text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT t.id, t.slug, t.name, t.status, t.time_zone
  FROM platform.tenant_domains d
  JOIN platform.tenants t ON t.id = d.tenant_id
  WHERE d.hostname = lower(p_host) AND d.status = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "platform"."tenant_by_slug"(text), "platform"."tenant_by_id"(uuid),
  "platform"."tenant_by_host"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "platform"."tenant_by_slug"(text), "platform"."tenant_by_id"(uuid),
  "platform"."tenant_by_host"(text) TO akoso_app;
