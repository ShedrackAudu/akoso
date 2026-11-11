-- Local development only. Runs once, when the Postgres volume is first created.
-- Passwords here are local defaults, not secrets; staging and production roles are
-- created by the hosting provider's tooling with secrets from its secret store.
--
-- Roles (brief sections 7 and 28.3):
--   akoso_owner            superuser from POSTGRES_USER. Local administration only;
--                          no application code ever connects as it.
--   akoso_migrator         owns the schema objects and runs migrations.
--   akoso_app              what the web app and worker use. No SUPERUSER, no
--                          BYPASSRLS, owns nothing, so it cannot alter tables or
--                          policies.
--   akoso_platform_reader  read-only, for platform-wide screens (decision D-OPEN-5).

CREATE ROLE akoso_migrator LOGIN PASSWORD 'akoso_migrator_local'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

CREATE ROLE akoso_app LOGIN PASSWORD 'akoso_app_local'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;

CREATE ROLE akoso_platform_reader LOGIN PASSWORD 'akoso_platform_reader_local'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;

-- Nobody but the migrator may create objects. Since PostgreSQL 15, ordinary roles
-- cannot create in the public schema; make that explicit rather than relying on it.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO akoso_migrator;
GRANT USAGE ON SCHEMA public TO akoso_app, akoso_platform_reader;

-- Platform-wide tables live in their own schema, apart from tenant tables.
CREATE SCHEMA platform AUTHORIZATION akoso_migrator;
GRANT USAGE ON SCHEMA platform TO akoso_app, akoso_platform_reader;

-- Tables the migrator creates later are usable by the app role, with no grant to
-- forget. Append-only tables then revoke UPDATE and DELETE explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE akoso_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO akoso_app;
