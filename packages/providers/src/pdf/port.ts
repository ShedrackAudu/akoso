/** A file sent alongside the HTML, referenced from it by name (e.g. `<img src="logo.svg">`). */
export interface PdfAsset {
  name: string
  content: Uint8Array
  contentType: string
}

export interface PdfPage {
  html: string
  assets: readonly PdfAsset[]
}

/** Thrown when the renderer fails, with whether trying again may help. */
export class PdfRenderError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = "PdfRenderError"
    this.retryable = retryable
  }
}

/**
 * Turns HTML into PDF (brief section 12). Called only from the worker, never from a web
 * request. Every image and font the page uses is sent with it: the renderer may not
 * fetch anything from a network.
 */
export interface PdfRenderer {
  /** Renders one page set to an A4 portrait PDF. */
  render(page: PdfPage): Promise<Uint8Array>
  /** Joins PDFs, in order, into one. */
  merge(pdfs: readonly Uint8Array[]): Promise<Uint8Array>
}
