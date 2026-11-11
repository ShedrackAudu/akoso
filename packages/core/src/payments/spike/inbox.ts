// Spike 04 only. Stores verified Paystack webhooks, once each.
import { createHash } from "node:crypto"

import { createDatabase, sql, type DatabaseHandle } from "@akoso/db"
import {
  checkPaystackSignature,
  type WebhookCheck,
} from "@akoso/providers/payments"
import { z } from "zod"

import { loadEnv } from "../../config/index"

let handle: DatabaseHandle | undefined

function database(): DatabaseHandle {
  handle ??= createDatabase(loadEnv(process.env).DATABASE_URL)
  return handle
}

/** The spike's Paystack settings. Separate from the main environment until payments are real. */
const paystackEnvSchema = z.object({
  PAYSTACK_SECRET_KEY: z
    .string()
    .startsWith("sk_test_", "spike 04 uses test keys only"),
  PAYSTACK_PUBLIC_KEY: z
    .string()
    .startsWith("pk_test_", "spike 04 uses test keys only"),
  PAYSTACK_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
})

export type PaystackEnv = z.infer<typeof paystackEnvSchema>

/** Reads the Paystack test keys. Names missing ones; never prints a value. */
export function loadPaystackEnv(
  source: Record<string, string | undefined>
): PaystackEnv {
  const parsed = paystackEnvSchema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    )
    throw new Error(`Paystack settings: ${problems.join("; ")}`)
  }
  return parsed.data
}

export type InboxOutcome =
  | { status: "stored"; dedupeKey: string; event: string }
  | { status: "repeat"; dedupeKey: string; event: string }
  | {
      status: "refused"
      reason: Exclude<WebhookCheck, { ok: true }>["reason"] | "not_json"
    }

/**
 * Verifies a webhook's signature and stores it once. A repeat (same event and
 * reference) is counted, not stored again, so it can never create a second payment.
 *
 * @param rawBody Exactly the bytes Paystack sent; verified before any parsing.
 * @param signatureHeader The `Paystack-Signature` header.
 * @param secrets The webhook signing secrets in use.
 */
export async function receivePaystackWebhook(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secrets: readonly string[]
): Promise<InboxOutcome> {
  const check = checkPaystackSignature(rawBody, signatureHeader, secrets)
  if (!check.ok) {
    return { status: "refused", reason: check.reason }
  }
  const text = new TextDecoder().decode(rawBody)
  let body: { event?: unknown; data?: { reference?: unknown } }
  try {
    body = JSON.parse(text) as typeof body
  } catch {
    return { status: "refused", reason: "not_json" }
  }
  const event = typeof body.event === "string" ? body.event : "unknown"
  const reference =
    typeof body.data?.reference === "string" ? body.data.reference : null
  // Events without a reference (account assignment, for example) are told apart by
  // their content.
  const dedupeKey = `${event}:${reference ?? createHash("sha256").update(rawBody).digest("hex")}`

  return database().db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      insert into spike_paystack.webhook_inbox (dedupe_key, event, reference, signature_key_id, raw_body)
      values (${dedupeKey}, ${event}, ${reference}, ${check.keyId}, ${text})
      on conflict (dedupe_key) do nothing
      returning dedupe_key`)
    if (inserted.rows.length > 0) {
      return { status: "stored", dedupeKey, event } as const
    }
    await tx.execute(
      sql`insert into spike_paystack.webhook_repeats (dedupe_key) values (${dedupeKey})`
    )
    return { status: "repeat", dedupeKey, event } as const
  })
}

export interface InboxRow {
  dedupeKey: string
  event: string
  reference: string | null
  receivedAt: string
  repeats: number
  body: unknown
}

/** Everything in the inbox, newest first, for the spike's scenario runner. */
export async function listPaystackInbox(): Promise<InboxRow[]> {
  const result = await database().db.execute(sql`
    select i.dedupe_key, i.event, i.reference, i.raw_body,
           to_char(i.received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as received_at,
           (select count(*)::int from spike_paystack.webhook_repeats r where r.dedupe_key = i.dedupe_key) as repeats
    from spike_paystack.webhook_inbox i
    order by i.received_at desc`)
  return result.rows.map((r) => ({
    dedupeKey: String(r.dedupe_key),
    event: String(r.event),
    reference: typeof r.reference === "string" ? r.reference : null,
    receivedAt: String(r.received_at),
    repeats: Number(r.repeats),
    body: JSON.parse(String(r.raw_body)) as unknown,
  }))
}

/** Closes the spike's connection pool (for scripts that exit). */
export async function closePaystackInbox(): Promise<void> {
  await handle?.close()
  handle = undefined
}
