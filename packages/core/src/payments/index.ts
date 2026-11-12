// Public interface of the payments module. Other modules import only from here.
export * from "./service"

// Spike 04 only, removed when the real payments module replaces it.
export {
  closePaystackInbox,
  listPaystackInbox,
  loadPaystackEnv,
  receivePaystackWebhook,
} from "./spike/inbox"
export type { InboxOutcome, InboxRow, PaystackEnv } from "./spike/inbox"
