// The access review as a CSV download (sign-in part B, section 3).
import { accessReview, accessReviewCsv } from "@akoso/core/identity"

import { requirePermission } from "@/server/session"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ school: string }> }

export async function GET(
  _request: Request,
  { params }: Context
): Promise<Response> {
  const { school } = await params
  const ctx = await requirePermission(school, "identity.access_review.read")
  const csv = accessReviewCsv(await accessReview(ctx))
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="access-review-${school}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
