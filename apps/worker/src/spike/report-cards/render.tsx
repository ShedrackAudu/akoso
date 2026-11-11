// Spike 03 only. Turns one card's data into the HTML and files Gotenberg needs.
import { createHash } from "node:crypto"

import { renderToStaticMarkup } from "react-dom/server"

import type { PdfAsset, PdfPage } from "@akoso/providers/pdf"

import type { ReportCardData } from "./data"
import { qrSvg } from "./assets"
import { ReportCard, STYLES } from "./template"

/** Bump when the template changes, so cached PDFs are not reused for a new layout. */
const TEMPLATE_VERSION = "spike-03.3"

export interface SharedAssets {
  logo: PdfAsset
  stamp: PdfAsset
  teacherSignature: PdfAsset
  principalSignature: PdfAsset
}

export async function buildPage(
  card: ReportCardData,
  shared: SharedAssets,
  photo: PdfAsset
): Promise<PdfPage> {
  const verifyUrl = `greenfield.akoso.ng/verify/${card.verificationCode}`
  const body = renderToStaticMarkup(
    <ReportCard
      card={card}
      qrSvg={await qrSvg(`https://${verifyUrl}`)}
      verifyUrl={verifyUrl}
    />
  )
  const html = `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><title>${card.cardId}</title><style>${STYLES}</style></head><body>${body}</body></html>`
  return {
    html,
    assets: [
      shared.logo,
      shared.stamp,
      shared.teacherSignature,
      shared.principalSignature,
      photo,
    ],
  }
}

/**
 * The cache key: a hash of everything that changes the PDF (brief section 12: "cache
 * PDFs by a hash of their inputs"). Same inputs, same key, no second render.
 */
export function cacheKey(page: PdfPage): string {
  const hash = createHash("sha256")
  hash.update(TEMPLATE_VERSION)
  hash.update(page.html)
  for (const asset of page.assets) {
    hash.update(asset.name)
    hash.update(asset.content)
  }
  return hash.digest("hex")
}
