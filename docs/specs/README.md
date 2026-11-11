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

None yet.
