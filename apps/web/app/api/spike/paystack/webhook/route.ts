// Spike 04: Paystack's webhook. A thin wrapper over @akoso/core: verify, store once,
// answer 200 at once (brief section 14). The work on a payment happens later, never here.
import { receivePaystackWebhook } from "@akoso/core/payments"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

function webhookSecrets(): string[] {
  // During a key rotation both secrets are set; Paystack signs with both for a while.
  return [
    process.env.PAYSTACK_WEBHOOK_SECRET,
    process.env.PAYSTACK_WEBHOOK_SECRET_PREVIOUS,
  ].filter((s): s is string => typeof s === "string" && s.startsWith("whsec_"))
}

export async function POST(request: Request): Promise<Response> {
  const secrets = webhookSecrets()
  if (secrets.length === 0) {
    // Misconfigured: say so to Paystack (it retries) without revealing anything.
    return new Response(null, { status: 500, headers: NO_STORE })
  }
  // The raw bytes: the signature covers exactly what Paystack sent, so nothing may parse
  // or re-encode the body first.
  const rawBody = new Uint8Array(await request.arrayBuffer())
  const outcome = await receivePaystackWebhook(
    rawBody,
    request.headers.get("paystack-signature"),
    secrets
  )
  if (outcome.status === "refused") {
    return new Response(null, {
      status: outcome.reason === "not_json" ? 400 : 401,
      headers: NO_STORE,
    })
  }
  // Stored or a repeat: both get 200, so Paystack stops resending.
  return Response.json({ received: true }, { headers: NO_STORE })
}
