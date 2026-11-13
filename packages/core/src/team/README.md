# team

Akoso team sign-in and the team itself, for the admin app (brief 26.2).

- **Product name:** Platform administration
- **Brief:** sections 26.2, 28
- **Main entities:** team_users, team_sessions, team_passkeys, team_verifications, team_role_grants, team_invitations, team_recovery_codes, team_security_events, team_audit_events (platform tables; none belongs to a school)
- **Public interface:** `index.ts`: `getTeamAuth()` (Better Auth with passkeys), `resolveTeamSignedIn()`, enrolment and recovery (`startEnrolment`, `startRecovery`, `createRecoveryCodes`), my passkeys, the Owner's team management, the team security log, `verifyTeamAuditChain`
- **Jobs and events:** none yet
- **Specs:** `docs/specs/stage-1-sign-in-part-b.md`, section 8

## Where this module lives

| Layer       | Path                             |
| ----------- | -------------------------------- |
| Use cases   | `packages/core/src/team/`        |
| Tables      | `packages/db/src/schema/team.ts` |
| Zod schemas | `packages/schemas/src/team.ts`   |

**Status:** built: passkey-only sign-in, enrolment links, recovery codes, team roles,
offboarding, the team security log and the hash-chained team audit log. Team accounts
are entirely separate from school accounts: their own tables, cookie and address.
