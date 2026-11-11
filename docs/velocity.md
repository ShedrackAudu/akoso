# Velocity

Estimated and actual hours for every feature (working rule 12). The founder uses this at
the velocity check at the end of every stage: if actual effort exceeds 1.2× the
estimate, items are deferred from the cut-line (brief section 32.3).

- Record the estimate **before** starting, in the spec.
- "Actual" is agent working time plus the founder's review time, entered separately
  where known. Agents cannot measure the founder's time; the founder fills it in.
- Do not adjust an estimate after the fact. A wrong estimate is information.

## Stage 1: Foundations

| Item                                                                                  | Estimate (h)  | Actual, agent (h)                 | Actual, founder review (h) | Ratio | Notes                                                                                                                            |
| ------------------------------------------------------------------------------------- | ------------- | --------------------------------- | -------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Step 0: project documents, brief split, hard-questions review, scaffold (section 3.2) | not estimated | one session                       |                            | n/a   | No estimate was recorded before starting, so there is no ratio. Estimates start with the next item                               |
| Spike 01: row-level security and `withTenant()`                                       | 8             | one session                       |                            | n/a   | Agent time was not measured to the hour, so no ratio. Result in `docs/spikes/01-rls-with-tenant.md`                              |
| Spike 02: offline score entry and sync                                                | 12            | one session, plus a phone session |                            | n/a   | Phone session done on a Redmi A2+. Agent time not measured to the hour, so no ratio. Result in `docs/spikes/02-offline-queue.md` |
| Spike 03: report-card PDFs with Gotenberg                                             | 10            | one session                       |                            | n/a   | Agent time not measured to the hour, so no ratio. Result in `docs/spikes/03-report-card-pdfs.md`                                 |

## Cut-line (brief section 32.3)

Deferred from the top first, if a stage runs late:

1. Agent and referral tracking
2. PTA scheduling
3. Staff attendance and leave
4. Sponsor screens for billing accounts (keep the data model)
5. Group and multi-branch screens (keep the data model)

Never cut: core results, fees and reconciliation tests, session rollover, tenancy,
security, automatic platform-fee collection with its backstop, or quality in stages 1–5.

**Deferred so far:** nothing.
