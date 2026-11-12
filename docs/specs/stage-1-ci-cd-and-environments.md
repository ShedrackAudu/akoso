# CI/CD and environments: security scans, then staging

- **Status:** Approved (founder, 12/11/2026). Part A is being built; Part B is on Render, Frankfurt (D-18), and delayed (D-19): images and the Blueprint first, deploys when there is something to show
- **Module:** `.github/workflows`, Dockerfiles, `docs/security`, `docs/runbooks` · **Brief:** sections 2, 28.2, 28.3, 31, 32 · **Stage:** 1
- **Estimate:** Part A 10 hours of agent time. Part B 14 hours, once your hosting decisions are made. About 1 hour of yours on GitHub and Renovate settings, plus account sign-ups for Part B
- **Closes:** T3 (missing scans), T6 (no Renovate), T7 (no `SECURITY.md`), T10 (unpinned images). Starts on D-OPEN-1 (hosting region) and D-OPEN-3 (Node version)

## Why two parts

The security scans need nothing from you except two GitHub settings, so they can be
built now. A staging deploy needs a hosting platform, a region, accounts in your name
and a domain. Those are your decisions (brief section 31, D-OPEN-1), so Part B starts
only once they are made. Part A also measures latency to the candidate regions, so you
choose from numbers rather than a map.

## User story

As the founder, I want every pull request checked for security problems, and every
merge to `main` deployed to a staging copy of Akoso automatically, so that problems are
caught before schools see them and releases are routine rather than risky.

## Part A: security scans in CI (now)

Every scan runs on each pull request and push to `main`, and again **weekly** so newly
published vulnerabilities in unchanged code are caught. A scan **fails the build on a
high or critical finding** (brief 28.2). A finding is never silenced to make a build
pass. A false positive may be suppressed only in the tool's own ignore file, with a
one-line reason and a date. Each suppression is also listed in `docs/security/scans.md`
for you to see.

| #   | Check                      | Tool                                                                                                       | What it catches                                                                                                                                                                                             |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Static analysis            | **Semgrep** (open-source rules: OWASP Top 10, TypeScript, React, Node, secrets)                            | Injection, XSS, unsafe redirects, weak crypto and other CWE Top 25 patterns                                                                                                                                 |
| A2  | Static analysis            | **CodeQL** (`security-extended` queries, JavaScript/TypeScript), free on public repositories               | Data-flow bugs Semgrep misses, such as user input reaching SQL or the file system                                                                                                                           |
| A3  | Dependencies               | **`pnpm audit`** (high and above) and **OSV-Scanner** on `pnpm-lock.yaml`                                  | Known vulnerabilities in every package, including development tools that run in CI                                                                                                                          |
| A4  | Containers                 | **Trivy** image scan of every image in `docker-compose.yml`, and of our own images once Part B builds them | Vulnerable operating-system packages in images. Our own images fail on high; the Compose images (local and CI only, maintained upstream) are reported but do not fail, as `docs/security/scans.md` explains |
| A5  | Configuration              | **Trivy** config scan (Dockerfiles, Compose) and **zizmor** (GitHub Actions workflows)                     | Containers running as root, secrets in images, workflows that leak tokens or run untrusted code                                                                                                             |
| A6  | Software bill of materials | **CycloneDX SBOM** (via Syft) from the lockfile and images, kept as a CI artifact on every merge to `main` | A list of exactly what ships, for supply-chain checks and incident response                                                                                                                                 |
| A7  | Secrets                    | gitleaks (in place)                                                                                        | Unchanged                                                                                                                                                                                                   |

Also in Part A:

- **Pin every image exactly** (T10): `postgres:16-alpine` and `minio/minio:latest` get
  exact versions and digests, as Gotenberg and PgBouncer already have.
- **Renovate** (T6): add `renovate.json`, which groups updates weekly, never automerges,
  keeps Actions pinned to commit SHAs and raises security updates at once. It starts
  working when you install the Renovate GitHub App on the repository.
- **`SECURITY.md` and `/.well-known/security.txt`** (T7): how to report a vulnerability,
  the response times from the brief (critical patched within 72 hours, high within 14
  days), and a contact address you choose (open question 1). `security.txt` is served by
  the web and admin apps.
- **`docs/security/scans.md`:** what each scan covers, the first results, every
  suppression and its reason.
- **Latency measurement for D-OPEN-1:** a small script that times connections from this
  computer to each candidate hosting region (open question 3), over many attempts, at
  different times of day. The numbers go into the decision record. It is one location
  only; the brief asks for Lagos, Abuja and Port Harcourt, so the same script can be run
  by anyone in those cities.

### Findings already likely

The first run will probably fail. Next 16, Playwright and the other development tools
have a large dependency tree, and the `postgres:16-alpine` and MinIO images may carry
operating-system vulnerabilities. Each finding is fixed by updating, or suppressed with
a recorded reason if it cannot affect Akoso. You see the list before the pull request is
merged.

### GitHub settings for you (Part A)

These are repository settings, so they are yours to change. I can make them with your OK:

1. Turn on **Dependabot alerts** (alerts only; Renovate opens the update pull requests).
   **Done 12/11/2026.**
2. Once the new scans pass, add them to the **required checks** in the `protect-main`
   ruleset, and add **code scanning results** as a rule so a high CodeQL or Semgrep
   finding blocks merging. **Both done 12/11/2026.**
3. **Signed commits** (brief 28.3): set up a signing key on your computer, which I can
   walk you through. Then turn on "require signed commits" in the ruleset. Merges done in
   GitHub's web page are signed by GitHub automatically. **Done 12/11/2026.**

## Part B: staging and deploys (after your decisions)

### What it does

1. **Container images.** Small production images for `web`, `admin` and `worker`
   (Next.js standalone output; the worker's esbuild bundle). Each image is built once in CI
   and runs as a non-root user on an exact Node version (D-OPEN-3). It is scanned by Trivy
   and pushed to GitHub's container registry with **build provenance** and an SBOM
   attached (brief 28.3).
2. **Staging deploys automatically** on every merge to `main`, after all checks pass. The
   same image is later promoted to production, never rebuilt.
3. **Migrations** run as their own step before the new version starts. They use the
   migration role, which only that step has (brief 31). Migrations are expand, migrate,
   contract, so the previous version keeps working during a deploy and a rollback.
4. **Production** (built now, used at launch): a GitHub environment that needs **your
   approval** for every deploy. It refuses to deploy during any school's results or
   resumption week (the change-freeze check reads a short list in the repository until the
   platform admin holds it).
5. **One-click rollback:** a workflow that redeploys the previous image by its digest.
   Rehearsed on staging, with `docs/runbooks/deploy-and-rollback.md`.
6. **Staging is private:** it holds only synthetic data from the seed script. It sits
   behind Cloudflare Access or a password, is never indexed by search engines, and uses
   Paystack, Termii and WhatsApp test credentials only.
7. **Secrets** live in the hosting platform's secret store. GitHub holds only a
   deploy token per environment, scoped to that environment.
8. **A dynamic scan (OWASP ZAP)** runs against staging weekly and before each release
   (brief 28.2), with the same rule: high findings fail.
9. **A smoke test** after each deploy (health endpoint, sign-in page, database reachable
   through the pooler). The deploy is marked failed, and rolled back, if it does not
   pass.

### Staging on Render, Frankfurt (D-18)

Prices from render.com/pricing on 12/11/2026, in US dollars a month. Billing is per
second, so a service that is switched off costs nothing while it is off.

| Piece          | Render service                                                                                                       | Plan                                    | Per month     |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| Web app        | Web service (Docker)                                                                                                 | 0.5 CPU, 512 MB                         | $7            |
| Platform admin | Web service (Docker)                                                                                                 | 0.5 CPU, 512 MB                         | $7            |
| Worker         | Background worker (Docker)                                                                                           | 0.5 CPU, 512 MB                         | $7            |
| Gotenberg      | Private service, reachable only inside Render's private network                                                      | 1 CPU, 2 GB (Chromium needs the memory) | $25           |
| Postgres 16+   | Render Postgres, with its built-in PgBouncer in transaction mode on port 6432, as locally                            | 0.5 CPU, 1 GB, about 5 GB of storage    | $19 + $1.50   |
| Object storage | A Cloudflare R2 bucket for staging only                                                                              | Free tier                               | $0            |
| DNS and TLS    | Cloudflare in front of `staging.akoso.ng` and `*.staging.akoso.ng`; until then Render's own `onrender.com` addresses | Free                                    | $0            |
| **Total**      |                                                                                                                      |                                         | **about $67** |

Plus the workspace plan:

- **Hobby ($0):** 1 seat, a 3-day point-in-time recovery window, 5 GB of bandwidth a
  month and 500 build minutes. Enough for staging.
- **Pro ($25):** a 7-day recovery window and more seats. Needed before real schools' data
  is on production.

Images are built in GitHub Actions and pulled by Render, so Render's build minutes are
barely used. Migrations run as Render's pre-deploy command, using the migration role on
the direct port 5432; the app uses the pooled port 6432. Render's instant rollback (5
builds kept) is the one-click rollback, and the GitHub workflow keeps the image digests
too.

Production adds larger plans, a second web instance and the Pro workspace. Its estimate
comes before launch, from staging's real usage.

The restore drill (brief 31: a restore into staging in under 2 hours) is a later item,
not part of this spec.

## Data changes

None to the application. Part B adds the migration-role connection variable
(`DATABASE_MIGRATOR_URL`) to `.env.example` when migrations first run in a deploy.

## Permissions

No action keys. Least privilege in CI:

- Each workflow and job declares only the permissions it needs.
- Scans that upload results get `security-events: write` and nothing more.
- Deploy jobs get `id-token: write` and `packages: write` only, and only in the
  `staging` and `production` environments.

## Threat model (STRIDE)

| Threat                     | Example                                                              | Mitigation                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A fork's pull request pretends to be a trusted deploy                | Deploys run only on `main` and only in GitHub environments. Pull requests from forks get no secrets and no write token; zizmor flags `pull_request_target` misuse                                                     |
| **Tampering**              | A compromised package or Action changes what ships                   | Frozen lockfile, Actions pinned to SHAs, only three packages may run install scripts, dependency and image scans, SBOM and build provenance, Renovate reviewed by a person, images promoted by digest, signed commits |
| **Repudiation**            | Nobody can tell who deployed what                                    | Every deploy is a workflow run tied to a commit and an image digest. Production needs your named approval in GitHub's environment log                                                                                 |
| **Information disclosure** | Secrets in logs, images or staging data                              | Secrets only in the host's store and GitHub environment secrets. gitleaks and Trivy check images and history. Staging holds synthetic data only and sits behind access control                                        |
| **Denial of service**      | A bad deploy takes the service down in results week                  | Change freeze check, smoke test with automatic rollback, expand-and-contract migrations, rollback by image digest                                                                                                     |
| **Elevation of privilege** | A CI job or the app gets more database or cloud access than it needs | Migration role used only by the migration step. The app role has no `BYPASSRLS` and owns nothing. Per-job GitHub permissions. Deploy tokens scoped per environment, and never your own logins                         |

## Acceptance criteria

Part A:

1. Semgrep, CodeQL, dependency, Trivy image and config, and zizmor checks run on every
   pull request, on push to `main` and weekly. Each **fails** on a planted high-severity
   example (proven once, then removed, as the R2 guard was).
2. Every image in `docker-compose.yml` is pinned to an exact version and digest.
3. A CycloneDX SBOM is kept as an artifact on every merge to `main`.
4. `renovate.json` is valid (checked with Renovate's validator in CI).
5. `SECURITY.md` and `/.well-known/security.txt` exist. `security.txt` is served by web
   and admin with a valid `Expires` field.
6. `docs/security/scans.md` lists the first results and every suppression with its
   reason.
7. Latency figures for each candidate region are recorded under D-OPEN-1.

Part B:

1. A merge to `main` deploys to staging with no manual step, and the smoke test passes.
2. A production deploy cannot run without your approval, and refuses during a listed
   freeze week.
3. The rollback workflow restores the previous version on staging. It is rehearsed once,
   and the time it took is recorded in the runbook.
4. The images run as non-root, carry provenance and an SBOM, and have no high or critical
   Trivy findings.
5. Staging cannot be reached without access control, and is not indexed by search engines.
6. A ZAP scan against staging runs weekly, with results in `docs/security/scans.md`.

## Out of scope

- Production itself: no real school data, and no production deploy until the pilot.
- The restore drill and backup exports (later in Stage 1 or in Stage 2).
- Sentry, uptime checks, PostHog and the status page. They need your accounts and get
  their own item.
- Penetration testing (before launch).

## Open questions

1. **Security contact (answered):** `security@akoso.ng`. It cannot receive mail until the domain is registered and forwarding is set up, which must happen before staging is reachable by anyone else.
2. **Domain (answered in part):** `akoso.ng` is not registered yet. Part A does not need it. Part B can start on the host's own address (for example `akoso-staging.<host>.app`), protected by a password in the app. Two things wait for the domain: school addresses (`<slug>.staging...`), which need a wildcard on a domain you own, and Cloudflare in front.
3. **Hosting platform (answered, D-18):** Render, Frankfurt.

4. **Node version (D-OPEN-3):** the images pin an exact Node version. Keep Node 24 if
   your chosen host supports it as LTS.
5. **Cost:** about $67 a month on the Hobby workspace (table above). You approve it and
   create the Render account yourself before anything is created.
