import { PdfRenderError, type PdfPage, type PdfRenderer } from "./port"

// A4 portrait, in inches (Gotenberg's unit).
const A4 = { width: "8.27", height: "11.7" }
const MARGIN_INCHES = "0.35"

export interface GotenbergOptions {
  /** e.g. http://localhost:3100 locally; a private address in production. */
  baseUrl: string
  /** Give up on one request after this long. */
  timeoutMs?: number
}

function blob(content: Uint8Array, type: string): Blob {
  // Copy into a fresh ArrayBuffer: Blob needs one, not a view on a shared buffer.
  return new Blob([new Uint8Array(content)], { type })
}

async function send(
  url: string,
  form: FormData,
  timeoutMs: number
): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    // Timeouts and refused connections (Gotenberg restarting) are worth retrying.
    const reason = error instanceof Error ? error.name : "unknown"
    throw new PdfRenderError(`Gotenberg could not be reached (${reason})`, true)
  }
  if (!response.ok) {
    // 5xx and 429 may pass on a retry; 4xx means the request itself is wrong.
    const retryable = response.status >= 500 || response.status === 429
    throw new PdfRenderError(
      `Gotenberg answered ${String(response.status)}`,
      retryable
    )
  }
  return new Uint8Array(await response.arrayBuffer())
}

/** The Gotenberg 9 adapter. Routes: /forms/chromium/convert/html and /forms/pdf/merge. */
export function createGotenbergRenderer(
  options: GotenbergOptions
): PdfRenderer {
  const timeoutMs = options.timeoutMs ?? 30_000
  return {
    async render(page: PdfPage): Promise<Uint8Array> {
      const form = new FormData()
      form.append(
        "files",
        blob(new TextEncoder().encode(page.html), "text/html"),
        "index.html"
      )
      for (const asset of page.assets) {
        form.append("files", blob(asset.content, asset.contentType), asset.name)
      }
      form.append("paperWidth", A4.width)
      form.append("paperHeight", A4.height)
      for (const side of [
        "marginTop",
        "marginBottom",
        "marginLeft",
        "marginRight",
      ]) {
        form.append(side, MARGIN_INCHES)
      }
      form.append("printBackground", "true")
      form.append("preferCssPageSize", "false")
      return send(
        `${options.baseUrl}/forms/chromium/convert/html`,
        form,
        timeoutMs
      )
    },

    async merge(pdfs: readonly Uint8Array[]): Promise<Uint8Array> {
      const form = new FormData()
      pdfs.forEach((pdf, i) => {
        // Gotenberg merges in alphabetical order of file names.
        form.append(
          "files",
          blob(pdf, "application/pdf"),
          `${String(i).padStart(5, "0")}.pdf`
        )
      })
      return send(`${options.baseUrl}/forms/pdf/merge`, form, timeoutMs * 4)
    },
  }
}
