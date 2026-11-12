# Security scans

What runs, what it found, and every suppression with its reason (brief section 28.2).
The scans live in `.github/workflows/security.yml` (and the secret scan in `ci.yml`). They
run on every pull request, on every push to `main` and weekly on Monday mornings.

## What runs, and what fails the build

| Check             | Tool                                                                                       | Fails on                                                                                           | Results also go to                                    |
| ----------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Static analysis   | Semgrep 1.184 (OWASP Top 10, TypeScript, JavaScript, React, nodejsscan, secrets rule sets) | Any ERROR-severity finding                                                                         | GitHub code scanning                                  |
| Static analysis   | CodeQL (`security-extended`, JavaScript/TypeScript)                                        | High findings, **once the "code scanning results" rule is on** in `protect-main` (founder setting) | GitHub code scanning                                  |
| Dependencies      | `pnpm audit`                                                                               | High or critical, development tools included                                                       | Job log                                               |
| Dependencies      | OSV-Scanner 2.7 on `pnpm-lock.yaml`                                                        | Nothing by itself (a second opinion; `pnpm audit` is the gate)                                     | GitHub code scanning                                  |
| Configuration     | Trivy 0.76 config scan (Dockerfiles, Compose)                                              | High or critical                                                                                   | Job log                                               |
| Workflows         | zizmor 1.32                                                                                | Medium and above                                                                                   | Job log                                               |
| Container images  | Trivy 0.76 image scan                                                                      | **Our own images** (Part B): high or critical. **Compose images:** reported only, see below        | Job summary                                           |
| Secrets           | gitleaks                                                                                   | Any secret                                                                                         | Job log                                               |
| Bill of materials | Syft (CycloneDX JSON)                                                                      | n/a                                                                                                | Artifact `akoso-sbom.cdx.json` on each push to `main` |

Every tool runs from an image pinned by digest, or from an Action pinned to a commit SHA.
Renovate proposes the updates.

### Why the Compose images do not fail the build

Postgres, PgBouncer and Gotenberg in `docker-compose.yml` run only on developers'
computers and in CI, against synthetic data. They are never deployed: staging and
production use managed Postgres and Akoso's own images. Their operating-system packages
are maintained upstream, so a high finding there is usually fixed by a new upstream
build that we cannot hurry. Failing every pull request on them would teach everyone to
ignore red builds. They are scanned and listed in each run's summary; Renovate moves to
the new digest once upstream rebuilds.

### Proof that each gate fails

On 12/11/2026 each gate was run against planted examples outside the repository, using
the same pinned images as CI:

| Planted                                                                                                  | Caught by                                                                         | Exit |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---- |
| Express open redirect from a query string                                                                | Semgrep (`express_open_redirect`)                                                 | 1    |
| Dockerfile with no non-root `USER`                                                                       | Trivy (`DS-0002`, high), and Semgrep                                              | 1    |
| Workflow on `pull_request_target` that checks out the pull request and puts its title in a shell command | zizmor (`dangerous-triggers`, `template-injection`, `unpinned-uses`), and Semgrep | 14   |
| A vulnerable dependency                                                                                  | `pnpm audit`: the real Zod finding below                                          | 1    |

CodeQL is proven when the code-scanning rule is switched on.

## Results

### 12/11/2026, first run (local, before the workflow existed)

| Check                 | Result                                                                                                                                                                              | Action                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Semgrep               | No findings                                                                                                                                                                         | None                                                                                                                                        |
| `pnpm audit`          | 1 high: `zod` 4.6.5 (GHSA-mrhx-c7xc-m3w5, memory exhaustion on oversized collections), pinned by `@serwist/turbopack` 9.5.13. 2 moderate (`glob`, `minimatch`), 1 low (`deepmerge`) | **Fixed:** a pnpm override to `zod` ^4.6.7 in `pnpm-workspace.yaml`, to be removed when Serwist updates. Moderate and low left for Renovate |
| OSV-Scanner           | The same 3 moderate                                                                                                                                                                 | None (below the gate)                                                                                                                       |
| Trivy config          | No findings                                                                                                                                                                         | None                                                                                                                                        |
| zizmor                | 4 medium: `actions/checkout` kept the token on disk (`artipacked`)                                                                                                                  | **Fixed:** `persist-credentials: false` on every checkout                                                                                   |
| Trivy, Compose images | `postgres:16.15-alpine3.24`: 18 high, `pgbouncer:v1.26.1-p0`: 3 high (musl, zlib, krb5 and others), all fixed in newer Alpine packages. Gotenberg 9.4.0: none                       | Reported only (see above). Renovate picks up the rebuilt images                                                                             |

### 12/11/2026, first run in CI (pull request #10)

Semgrep flagged one ERROR finding that the local run missed, because the local run had
skipped test files: `njsscan.generic.hardcoded_secrets.node_secret` on the made-up
webhook secret in `webhook-signature.test.ts`. Suppressed (below). Every other job passed.

## Suppressions

| Date       | Tool and rule                                           | Where                                                                                                   | Reason                                                                                              |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 12/11/2026 | Semgrep `njsscan.generic.hardcoded_secrets.node_secret` | `packages/providers/src/payments/webhook-signature.test.ts`, the `SECRET` constant (inline `nosemgrep`) | A made-up value used only to sign test payloads. It is not a Paystack secret and signs nothing real |

A suppression goes in the tool's own mechanism (an inline `nosemgrep` comment,
`.trivyignore`, a `# zizmor: ignore[...]` comment or a pnpm override), for one rule at
one place, with a reason and a date. It is listed here too.
