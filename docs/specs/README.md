# Specs

One page per feature, written **before** the code (working rule 1). A spec must be
complete enough for a contract developer to build the feature from it alone.

Anything touching money, results, auth or tenancy waits for the founder's approval
before coding starts.

## Template

Copy this into `docs/specs/<stage>-<feature>.md`.

```markdown
# <Feature name>

- **Status:** Draft | Approved (founder, dd/mm/yyyy) | Built
- **Module:** <module> · **Brief:** section <n> · **Stage:** <n>
- **Estimate:** <hours> (recorded in docs/velocity.md)

## User story

As a <role>, I want <what>, so that <why>.

## What it does

The behaviour, step by step, in plain language.

## Data changes

Tables and columns added or changed; RLS policies; indexes; whether each table is
append-only; retention. Migrations are expand, migrate, contract.

## Permissions

Action keys added to docs/permissions.md, the roles allowed, any two-person control,
and what is audited.

## API and jobs

Use cases in packages/core, /api/v1 endpoints, background jobs and domain events.

## Edge cases

Including time zones, offline, duplicates, concurrency and bad input.

## Threat model

Required for auth, money, results, personal data, files or tenancy (brief 28.2).
STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service,
elevation of privilege, each with its mitigation.

## Acceptance criteria

Testable statements, including the brief's own acceptance lines for this feature.

## Out of scope

## Open questions
```

## Specs

| Spec                                                                              | Status                                             |
| --------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Spike 01: RLS and `withTenant()`](stage-1-spike-01-rls-with-tenant.md)           | Built                                              |
| [Spike 02: offline queue](stage-1-spike-02-offline-queue.md)                      | Built                                              |
| [Spike 03: report-card PDFs](stage-1-spike-03-report-card-pdfs.md)                | Built                                              |
| [Spike 04: Paystack in test mode](stage-1-spike-04-paystack.md)                   | Partly built; blocked on the Paystack account tier |
| [CI/CD and environments](stage-1-ci-cd-and-environments.md)                       | Part A built; Part B on Render, delayed (D-19)     |
| [Service layer and `/api/v1` conventions](stage-1-api-and-service-conventions.md) | Built                                              |
| [Tenancy](stage-1-tenancy.md)                                                     | Built; memberships come with sign-in               |
| [Sign-in, part A](stage-1-sign-in.md)                                             | Built; part B next                                 |
| [Time zones, audit log, flags and settings](stage-1-time-audit-flags.md)          | Built                                              |
| [Sign-in, part B](stage-1-sign-in-part-b.md)                                      | Built                                              |
| [The app frame (Stage 2)](stage-2-app-frame.md)                                   | Approved                                           |
