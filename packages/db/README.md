# @akoso/db

The Drizzle schema, migrations, row-level security policies and `withTenant()`.

- Every tenant-owned table has `tenant_id uuid NOT NULL`, first in every composite index, with RLS enabled and forced and both `USING` and `WITH CHECK` policies (brief section 7).
- The application role has no SUPERUSER or BYPASSRLS; migrations run under a separate role.
- One schema file per module in `src/schema/`. Only that module's services in `@akoso/core` use its tables.
- Apps never import this package directly; they call `@akoso/core`.

**Status:** placeholders only. No tables exist yet.
