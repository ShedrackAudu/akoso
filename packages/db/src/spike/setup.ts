// Spike 01 only (docs/specs/stage-1-spike-01-rls-with-tenant.md). Throwaway tables
// prefixed `spike_`, dropped before anything merges. Not exported from @akoso/db.
import { Client } from "pg"

/**
 * Local connections, matching docker-compose.yml. The values are local defaults, not
 * secrets. Each can be overridden by an environment variable for CI.
 */
export const CONNECTIONS = {
  // Through PgBouncer in transaction mode, as the app connects in production.
  app:
    process.env.SPIKE_APP_URL ??
    "postgres://akoso_app:akoso_app_local@localhost:6432/akoso_dev",
  platformReader:
    process.env.SPIKE_PLATFORM_READER_URL ??
    "postgres://akoso_platform_reader:akoso_platform_reader_local@localhost:6432/akoso_dev",
  // Straight to Postgres: migrations and set-up never go through the pooler.
  migrator:
    process.env.SPIKE_MIGRATOR_URL ??
    "postgres://akoso_migrator:akoso_migrator_local@localhost:5433/akoso_dev",
  owner:
    process.env.SPIKE_OWNER_URL ??
    "postgres://akoso_owner:akoso_local_only@localhost:5433/akoso_dev",
} as const

export const TENANT_A = "0a000000-0000-4000-8000-00000000000a"
export const TENANT_B = "0b000000-0000-4000-8000-00000000000b"

// The policy every tenant table gets. `nullif` turns an unset setting, which can read
// back as an empty string, into NULL, so the comparison is never true and no rows
// match. Without it, the cast would raise an error instead.
const TENANT_MATCH =
  "tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid"

const tenantTable = (name: string, columns: string): string => `
  CREATE TABLE public.${name} (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    ${columns},
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX ${name}_tenant_created_idx ON public.${name} (tenant_id, created_at);
  ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.${name} FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON public.${name}
    FOR ALL USING (${TENANT_MATCH}) WITH CHECK (${TENANT_MATCH});
`

/** Run as the migrator: the tables, as a real migration would create them. */
const MIGRATOR_DDL = `
  DROP TABLE IF EXISTS public.spike_students, public.spike_payments CASCADE;
  DROP TABLE IF EXISTS platform.spike_tenants, platform.spike_student_counts CASCADE;
  DROP VIEW IF EXISTS public.spike_students_view;

  ${tenantTable("spike_students", "full_name text NOT NULL")}

  ${tenantTable("spike_payments", "amount_kobo bigint NOT NULL CHECK (amount_kobo > 0)")}
  -- Append-only: payments are never edited or deleted (brief sections 27 and 28.3).
  REVOKE UPDATE, DELETE, TRUNCATE ON public.spike_payments FROM akoso_app;

  -- A view owned by the migrator, to prove views cannot be used to step around RLS.
  CREATE VIEW public.spike_students_view AS SELECT id, tenant_id, full_name FROM public.spike_students;
  GRANT SELECT ON public.spike_students_view TO akoso_app;

  -- D-OPEN-5 option (a): platform tables, outside the tenant schema.
  CREATE TABLE platform.spike_tenants (id uuid PRIMARY KEY, name text NOT NULL);
  GRANT SELECT ON platform.spike_tenants TO akoso_app;

  CREATE TABLE platform.spike_student_counts (
    tenant_id uuid PRIMARY KEY REFERENCES platform.spike_tenants (id),
    student_count integer NOT NULL,
    computed_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE platform.spike_student_counts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE platform.spike_student_counts FORCE ROW LEVEL SECURITY;
  -- The app may write only its own school's figure, from inside withTenant().
  CREATE POLICY app_writes_own ON platform.spike_student_counts FOR ALL TO akoso_app
    USING (${TENANT_MATCH}) WITH CHECK (${TENANT_MATCH});
  -- The platform reader may read every school's figure, and nothing else.
  CREATE POLICY platform_reads_all ON platform.spike_student_counts FOR SELECT
    TO akoso_platform_reader USING (true);
  GRANT SELECT, INSERT, UPDATE ON platform.spike_student_counts TO akoso_app;
  GRANT SELECT ON platform.spike_student_counts TO akoso_platform_reader;
`

/**
 * Run as the local superuser. D-OPEN-5 option (b) needs a role that bypasses RLS to
 * own a cross-school view, and only a superuser can create such a role. That this is
 * needed at all is part of the spike's finding.
 */
const OWNER_DDL = `
  DROP VIEW IF EXISTS platform.spike_student_counts_live;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'akoso_platform_view_owner') THEN
      CREATE ROLE akoso_platform_view_owner NOLOGIN BYPASSRLS;
    END IF;
  END $$;
  GRANT USAGE ON SCHEMA platform TO akoso_platform_view_owner;
  GRANT CREATE ON SCHEMA platform TO akoso_platform_view_owner;
  GRANT SELECT ON public.spike_students TO akoso_platform_view_owner;
  SET ROLE akoso_platform_view_owner;
  CREATE VIEW platform.spike_student_counts_live AS
    SELECT tenant_id, count(*)::integer AS student_count
    FROM public.spike_students GROUP BY tenant_id;
  RESET ROLE;
  GRANT SELECT ON platform.spike_student_counts_live TO akoso_platform_reader;
`

const DROP_ALL = `
  DROP VIEW IF EXISTS platform.spike_student_counts_live;
  DROP VIEW IF EXISTS public.spike_students_view;
  DROP TABLE IF EXISTS public.spike_students, public.spike_payments CASCADE;
  DROP TABLE IF EXISTS platform.spike_student_counts, platform.spike_tenants CASCADE;
`

async function runAs(
  connectionString: string,
  statements: string
): Promise<void> {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(statements)
  } finally {
    await client.end()
  }
}

/** Creates the spike tables and two schools with a few rows each. */
export async function createSpikeSchema(): Promise<void> {
  await runAs(CONNECTIONS.owner, DROP_ALL)
  await runAs(CONNECTIONS.migrator, MIGRATOR_DDL)
  await runAs(CONNECTIONS.owner, OWNER_DDL)
  // Seed through the migrator, with each school's tenant set, as the policy requires
  // even for the table owner.
  await runAs(
    CONNECTIONS.migrator,
    `
    INSERT INTO platform.spike_tenants (id, name) VALUES
      ('${TENANT_A}', 'Greenfield Academy (fake)'), ('${TENANT_B}', 'Riverside School (fake)');
    BEGIN;
    SELECT set_config('app.tenant_id', '${TENANT_A}', true);
    INSERT INTO public.spike_students (tenant_id, full_name) VALUES
      ('${TENANT_A}', 'Ada Test'), ('${TENANT_A}', 'Chidi Test'), ('${TENANT_A}', 'Bola Test');
    INSERT INTO public.spike_payments (tenant_id, amount_kobo) VALUES ('${TENANT_A}', 4500000);
    COMMIT;
    BEGIN;
    SELECT set_config('app.tenant_id', '${TENANT_B}', true);
    INSERT INTO public.spike_students (tenant_id, full_name) VALUES
      ('${TENANT_B}', 'Emeka Test'), ('${TENANT_B}', 'Funke Test');
    INSERT INTO public.spike_payments (tenant_id, amount_kobo) VALUES ('${TENANT_B}', 3000000);
    COMMIT;
  `
  )
}

export async function dropSpikeSchema(): Promise<void> {
  await runAs(CONNECTIONS.owner, DROP_ALL)
}

/**
 * How to make a valid row in each tenant table, for the cross-school tests. The
 * catalogue test fails if a tenant table has no entry here, so a new table cannot
 * skip the isolation tests.
 */
export const TENANT_TABLE_FIXTURES: Record<
  string,
  { insertColumns: string; insertValues: string; updateSet: string }
> = {
  spike_students: {
    insertColumns: "full_name",
    insertValues: "'Intruder Test'",
    updateSet: "full_name = 'Changed by another school'",
  },
  spike_payments: {
    insertColumns: "amount_kobo",
    insertValues: "100",
    updateSet: "amount_kobo = 1",
  },
}
