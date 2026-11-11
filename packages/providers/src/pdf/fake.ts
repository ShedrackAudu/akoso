import type { PdfPage, PdfRenderer } from "./port"

/**
 * The fake renderer for tests and local work without Docker. It returns a stand-in
 * document whose text records what it was given, so tests can check the HTML and
 * assets without a real PDF engine.
 */
export function createFakePdfRenderer(): PdfRenderer & { rendered: PdfPage[] } {
  const rendered: PdfPage[] = []
  const encoder = new TextEncoder()
  return {
    rendered,
    render(page: PdfPage): Promise<Uint8Array> {
      rendered.push(page)
      return Promise.resolve(
        encoder.encode(
          `%PDF-fake\n${String(page.html.length)} bytes of HTML, ${String(page.assets.length)} assets\n`
        )
      )
    },
    merge(pdfs: readonly Uint8Array[]): Promise<Uint8Array> {
      return Promise.resolve(
        encoder.encode(`%PDF-fake\nmerged ${String(pdfs.length)}\n`)
      )
    },
  }
}
