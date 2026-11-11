# Akoso

The operating system for modern Nigerian schools: fees, results, attendance, staff and
parents, brought together in one place.

Akoso is a multi-tenant school management platform for Nigerian private nursery,
primary and secondary schools. This repository holds the web app, the platform admin,
the background worker and, later, the mobile app.

**Status:** Stage 1, step 0. The repository is a building, tested, empty skeleton. No
product feature exists yet. See [`docs/progress.md`](docs/progress.md).

## Where to start

| If you are                 | Read                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| An AI coding agent         | [`AGENTS.md`](AGENTS.md), then [`docs/ARCHITECTURE-ESSENTIALS.md`](docs/ARCHITECTURE-ESSENTIALS.md) and [`docs/progress.md`](docs/progress.md) |
| New to the product         | [`docs/PRD.md`](docs/PRD.md)                                                                                                                   |
| New to the code            | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                                                                                                 |
| Looking for the full brief | [`docs/brief/README.md`](docs/brief/README.md)                                                                                                 |

## Local setup

About 15 minutes on Windows, macOS or Linux.

### You need

- **Node.js 24** (`.nvmrc` pins it)
- **pnpm**, through corepack, which ships with Node
- **Docker** (Docker Desktop on Windows and macOS) for Postgres, Gotenberg and MinIO
- **Git**

### Steps

1. Enable pnpm. The version is pinned in `package.json`.

   ```bash
   corepack enable
   ```

   On Windows this may fail with a permissions error, because it writes into
   `C:\Program Files\nodejs`. Either run the terminal as Administrator once, or put the
   shim in your user folder instead:

   ```bash
   corepack enable --install-directory "%APPDATA%\npm" pnpm
   ```

2. Install dependencies.

   ```bash
   pnpm install
   ```

3. Create your local environment file. The defaults work with Docker Compose as they are.

   ```bash
   cp .env.example .env
   ```

4. Start the local services.

   ```bash
   docker compose up -d
   ```

5. Start the web app, then open http://localhost:3000.

   ```bash
   pnpm dev
   ```

The platform admin runs with `pnpm dev:admin` on http://localhost:3001.

### Local services

| Service     | Address                                 | Purpose                                                                          |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| Postgres 16 | `localhost:5433`                        | The database. Port 5433, because a locally installed PostgreSQL often takes 5432 |
| PgBouncer   | `localhost:6432`                        | Connection pooler in transaction mode. The app connects here                     |
| Gotenberg   | http://localhost:3100                   | HTML to PDF (9.4.0, JavaScript off, no outbound requests)                        |
| MinIO       | http://localhost:9000 (console on 9001) | Local S3-compatible storage                                                      |

Their credentials are local defaults in `docker-compose.yml`, not secrets. Never point
local tools at real data.

## Commands

| Command            | What it does                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `pnpm dev`         | Web app on port 3000                                              |
| `pnpm dev:admin`   | Platform admin on port 3001                                       |
| `pnpm check`       | Formatting, types, lint, tests, import boundaries and unused code |
| `pnpm build`       | Build every app                                                   |
| `pnpm test`        | Tests only                                                        |
| `pnpm test:db`     | Database and tenant-isolation tests (start Docker first)          |
| `pnpm test:e2e`    | Browser tests; builds and starts the app (start Docker first)     |
| `pnpm format`      | Format with Prettier                                              |
| `pnpm brief:split` | Regenerate `docs/brief/` after the master prompt changes          |

More in [`docs/testing.md`](docs/testing.md).

## Layout

```
apps/       web · admin · worker · mobile
packages/   core · db · domain · schemas · providers · api-client · ui
docs/       the brief, specs, decisions and everything else written down
```

## Ground rules

- One school must never see another school's data. Every query runs inside
  `withTenant()` under forced row-level security.
- Money is integer kobo. Payments are never edited or deleted.
- Published results come only from approved snapshots.
- Secrets never enter the repository. `.env` is gitignored; `.env.example` documents
  every variable.

Akoso is not described as "tamper-proof", "fully compliant" or "error-free". Legal and
privacy documents in this repository are templates for legal review.
