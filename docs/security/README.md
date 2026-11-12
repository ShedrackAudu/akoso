# Security Documents

Kept up to date as the platform is built (brief section 28). `scans.md` exists; the rest is
written as the platform is built.

| Document                  | What it holds                                                                                                                                                                                                                                                                      | Stage                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `asvs.md`                 | The OWASP ASVS checklist: Level 2 for the whole platform, with selected Level 3 controls for authentication, sessions, payments, payroll, results approval and the platform admin. Each requirement maps to the code or test that meets it, or a recorded reason it does not apply | Started in Stage 1                            |
| `threat-models/`          | One short STRIDE threat model per feature touching auth, money, results, personal data, files or tenancy, written in its spec and reviewed by the founder                                                                                                                          | With each spec                                |
| `pre-launch-checklist.md` | The 20 items in section 28.4, each verified against the actual code and running staging, with evidence                                                                                                                                                                             | Pilot readiness gate, and again before launch |
| `scans.md`                | Summaries of SAST, dependency, secret, container and dynamic scan results                                                                                                                                                                                                          | Stage 1 onwards                               |
| `pen-test/`               | Independent penetration-test reports                                                                                                                                                                                                                                               | Before launch                                 |
| `accepted-risks.md`       | Risks the founder has accepted in writing                                                                                                                                                                                                                                          | As they arise                                 |
| `access-review/`          | The quarterly access review: every elevated account, last sign-in and MFA status                                                                                                                                                                                                   | From the first pilot                          |

## In place today

- Secrets are gitignored (`.env`, `.env.*`), and CI scans every push for secrets.
- GitHub Actions are pinned to commit SHAs; CI installs with a frozen lockfile and runs
  with read-only repository permissions.
- Only three packages may run install scripts (`pnpm-workspace.yaml`).
- Environment validation never prints a variable's value.
- Security scans on every pull request, every push to `main` and weekly: Semgrep,
  CodeQL, `pnpm audit` and OSV-Scanner, Trivy (configuration and images) and zizmor,
  with an SBOM on each merge (`scans.md`).
- The six Security jobs are required checks on `main`, alongside CI (12/11/2026).
  Dependabot alerts are on; Renovate opens the update pull requests.
- Renovate configuration, `SECURITY.md` and `/.well-known/security.txt`.

Everything else in section 28 is still to be built. Akoso is designed to be
tamper-resistant and tamper-evident; it is never described as tamper-proof.
