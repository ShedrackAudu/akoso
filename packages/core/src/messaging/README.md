# messaging

The notifications outbox, channel selection and fallback, templates, broadcasts with cost preview, message credits, announcements, events and RSVPs, permission slips, PTA slots and parent-teacher conversations.

- **Product name:** Akoso Parent
- **Brief:** section 17 (`docs/brief/`)
- **Main entities:** notifications, message_templates, message_deliveries, credit_ledger, announcements, school_events, event_rsvps, permission_slips, permission_responses, pta_slots, conversations
- **Public interface:** `index.ts` (nothing exported yet)
- **Jobs and events:** none yet
- **Specs:** none yet (`docs/specs/`)

## Where this module lives

| Layer          | Path                                  |
| -------------- | ------------------------------------- |
| Use cases      | `packages/core/src/messaging/`        |
| Tables and RLS | `packages/db/src/schema/messaging.ts` |
| Zod schemas    | `packages/schemas/src/messaging.ts`   |

**Status:** placeholder. Nothing is implemented yet.
