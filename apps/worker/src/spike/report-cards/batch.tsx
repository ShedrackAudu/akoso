// Spike 03 only. Renders the made-up school's report cards through Gotenberg and
// measures time and size (docs/specs/stage-1-spike-03-report-card-pdfs.md).
//
//   node dist/spike-report-cards.mjs --limit=600 --concurrency=4 [--fresh]
//     [--fail-every=25] [--restart-gotenberg-at=300] [--merge-zip]
//   node dist/spike-report-cards.mjs --breakdown
//   node dist/spike-report-cards.mjs --preview
import { spawn } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { cpus, tmpdir, totalmem } from "node:os"
import { join, resolve } from "node:path"

import sharp from "sharp"

import {
  PdfRenderError,
  createGotenbergRenderer,
  type PdfAsset,
  type PdfPage,
  type PdfRenderer,
} from "@akoso/providers/pdf"

import { logoSvg, photoJpeg, signatureSvg, stampSvg } from "./assets"
import { buildSchool, type ReportCardData } from "./data"
import { buildPage, cacheKey, type SharedAssets } from "./render"
import { zip } from "./zip"

const SIZE_LIMIT_BYTES = 300 * 1024
const RETRIES = 3
const REPO_ROOT = resolve(import.meta.dirname, "../../..")

function arg(name: string): string | undefined {
  const found = process.argv.find(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`)
  )
  if (found === undefined) return undefined
  return found.includes("=") ? found.slice(found.indexOf("=") + 1) : "true"
}

const options = {
  limit: Number(arg("limit") ?? "600"),
  concurrency: Number(arg("concurrency") ?? "4"),
  fresh: arg("fresh") === "true",
  failEvery: Number(arg("fail-every") ?? "0"),
  restartAt: Number(arg("restart-gotenberg-at") ?? "0"),
  mergeZip: arg("merge-zip") === "true",
  out: arg("out") ?? join(tmpdir(), "akoso-spike-03"),
  gotenberg: arg("gotenberg") ?? "http://localhost:3100",
  label: arg("label") ?? "run",
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms))

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return (
    sorted[
      Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
    ] ?? 0
  )
}

const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`

/** Wraps a renderer so every Nth first attempt fails, to prove the retries work. */
function withInjectedFailures(inner: PdfRenderer, every: number): PdfRenderer {
  let calls = 0
  return {
    async render(page: PdfPage): Promise<Uint8Array> {
      calls += 1
      if (every > 0 && calls % every === 0) {
        throw new PdfRenderError("injected failure", true)
      }
      return inner.render(page)
    },
    merge: (pdfs) => inner.merge(pdfs),
  }
}

async function renderWithRetry(
  renderer: PdfRenderer,
  page: PdfPage
): Promise<{ pdf: Uint8Array; attempts: number }> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return { pdf: await renderer.render(page), attempts: attempt }
    } catch (error) {
      const retryable = error instanceof PdfRenderError && error.retryable
      if (!retryable || attempt >= RETRIES + 1) throw error
      await sleep(500 * 2 ** (attempt - 1))
    }
  }
}

function sharedAssets(card: ReportCardData): SharedAssets {
  return {
    logo: logoSvg(card.school.colour),
    stamp: stampSvg(card.school.name),
    teacherSignature: signatureSvg("sig-teacher.svg", 3),
    principalSignature: signatureSvg("sig-principal.svg", 7),
  }
}

async function runBatch(): Promise<void> {
  const cards = buildSchool().slice(0, options.limit)
  const cacheDir = join(options.out, "cache")
  const cardsDir = join(options.out, "cards")
  if (options.fresh) rmSync(options.out, { recursive: true, force: true })
  mkdirSync(cacheDir, { recursive: true })
  mkdirSync(cardsDir, { recursive: true })

  const first = cards[0]
  if (first === undefined) throw new Error("no cards")
  const shared = sharedAssets(first)

  // Photos are prepared before timing starts, and kept: in the real system each is
  // re-encoded once, at upload, and never changes. (Regenerating them each run made
  // every photo's bytes differ, because the stand-in is random noise, so the cache
  // missed every card. Found by the cache test.)
  const photoDir = join(options.out, "photos")
  mkdirSync(photoDir, { recursive: true })
  const photos: PdfAsset[] = []
  for (let i = 0; i < cards.length; i += 1) {
    const path = join(photoDir, `${String(i)}.jpg`)
    if (existsSync(path)) {
      photos.push({
        name: "photo.jpg",
        content: readFileSync(path),
        contentType: "image/jpeg",
      })
    } else {
      const photo = await photoJpeg(i)
      writeFileSync(path, photo.content)
      photos.push(photo)
    }
  }

  const renderer = withInjectedFailures(
    createGotenbergRenderer({ baseUrl: options.gotenberg, timeoutMs: 30_000 }),
    options.failEvery
  )

  const results: {
    cardId: string
    className: string
    bytes: number
    ms: number
    cached: boolean
    attempts: number
    failed: string | null
  }[] = []
  let next = 0
  let done = 0
  let restarted = false
  const started = performance.now()

  const workerLoop = async (): Promise<void> => {
    for (;;) {
      const index = next++
      const card = cards[index]
      const photo = photos[index]
      if (card === undefined || photo === undefined) return
      const t0 = performance.now()
      const page = await buildPage(card, shared, photo)
      const key = cacheKey(page)
      const cachePath = join(cacheDir, `${key}.pdf`)
      const classDir = join(cardsDir, card.student.className)
      mkdirSync(classDir, { recursive: true })
      const outPath = join(
        classDir,
        `${card.student.admissionNumber.replaceAll("/", "-")}.pdf`
      )
      try {
        let pdf: Uint8Array
        let attempts = 0
        const cached = existsSync(cachePath)
        if (cached) {
          pdf = readFileSync(cachePath)
        } else {
          const rendered = await renderWithRetry(renderer, page)
          pdf = rendered.pdf
          attempts = rendered.attempts
          writeFileSync(cachePath, pdf)
        }
        writeFileSync(outPath, pdf)
        results.push({
          cardId: card.cardId,
          className: card.student.className,
          bytes: pdf.length,
          ms: performance.now() - t0,
          cached,
          attempts,
          failed: null,
        })
      } catch (error) {
        results.push({
          cardId: card.cardId,
          className: card.student.className,
          bytes: 0,
          ms: performance.now() - t0,
          cached: false,
          attempts: RETRIES + 1,
          failed: error instanceof Error ? error.message : String(error),
        })
      }
      done += 1
      if (done % 50 === 0 || done === cards.length) {
        const secs = (performance.now() - started) / 1000
        console.log(
          `  ${String(done)}/${String(cards.length)} cards, ${secs.toFixed(1)} s`
        )
      }
      if (options.restartAt > 0 && !restarted && done >= options.restartAt) {
        restarted = true
        console.log("  restarting Gotenberg mid-batch...")
        spawn("docker", ["compose", "restart", "gotenberg"], {
          cwd: REPO_ROOT,
          stdio: "ignore",
        })
      }
    }
  }

  await Promise.all(
    Array.from({ length: options.concurrency }, () => workerLoop())
  )
  const elapsedMs = performance.now() - started

  const ok = results.filter((r) => r.failed === null)
  const sizes = ok.map((r) => r.bytes)
  const renderedTimes = ok.filter((r) => !r.cached).map((r) => r.ms)
  const summary = {
    label: options.label,
    machine: {
      cpus: cpus().length,
      cpuModel: cpus()[0]?.model ?? "?",
      memoryGiB: Math.round(totalmem() / 2 ** 30),
    },
    cards: cards.length,
    concurrency: options.concurrency,
    elapsedSeconds: Number((elapsedMs / 1000).toFixed(1)),
    cardsPerSecond: Number((cards.length / (elapsedMs / 1000)).toFixed(2)),
    projectedSecondsFor600: Number(
      ((600 / cards.length) * (elapsedMs / 1000)).toFixed(0)
    ),
    rendered: ok.filter((r) => !r.cached).length,
    fromCache: ok.filter((r) => r.cached).length,
    retried: ok.filter((r) => r.attempts > 1).length,
    failed: results
      .filter((r) => r.failed !== null)
      .map((r) => `${r.cardId}: ${r.failed ?? ""}`),
    renderMs:
      renderedTimes.length > 0
        ? {
            p50: Math.round(percentile(renderedTimes, 50)),
            p95: Math.round(percentile(renderedTimes, 95)),
          }
        : null,
    size:
      sizes.length > 0
        ? {
            min: kib(Math.min(...sizes)),
            median: kib(percentile(sizes, 50)),
            p95: kib(percentile(sizes, 95)),
            max: kib(Math.max(...sizes)),
            over300KiB: sizes.filter((s) => s > SIZE_LIMIT_BYTES).length,
          }
        : null,
    merge: null as null | Record<string, string | number>,
  }

  if (options.mergeZip) {
    const classes = [...new Set(ok.map((r) => r.className))]
    const firstClass = classes[0]
    const classCards = ok.filter((r) => r.className === firstClass)
    const pdfs = classCards.map((r) => {
      const card = cards.find((c) => c.cardId === r.cardId)
      return readFileSync(
        join(
          cardsDir,
          r.className,
          `${card?.student.admissionNumber.replaceAll("/", "-") ?? ""}.pdf`
        )
      )
    })
    const tm = performance.now()
    const merged = await renderer.merge(pdfs)
    const mergeMs = performance.now() - tm
    writeFileSync(
      join(options.out, `${firstClass ?? "class"}-merged.pdf`),
      merged
    )
    const tz = performance.now()
    const archive = zip(
      ok.map((r) => {
        const card = cards.find((c) => c.cardId === r.cardId)
        const name = `${r.className}/${card?.student.admissionNumber.replaceAll("/", "-") ?? ""}.pdf`
        return { name, content: readFileSync(join(cardsDir, name)) }
      })
    )
    const zipMs = performance.now() - tz
    writeFileSync(join(options.out, "all-report-cards.zip"), archive)
    summary.merge = {
      class: firstClass ?? "",
      classCards: pdfs.length,
      mergedSize: kib(merged.length),
      mergeSeconds: Number((mergeMs / 1000).toFixed(1)),
      zipCards: ok.length,
      zipSize: kib(archive.length),
      zipSeconds: Number((zipMs / 1000).toFixed(1)),
    }
  }

  writeFileSync(
    join(options.out, `summary-${options.label}.json`),
    JSON.stringify(summary, null, 2)
  )
  console.log(JSON.stringify(summary, null, 2))
}

/** How much each part of a card adds to its size: render variants of one card. */
async function runBreakdown(): Promise<void> {
  const card = buildSchool()[0]
  if (card === undefined) return
  const shared = sharedAssets(card)
  const renderer = createGotenbergRenderer({ baseUrl: options.gotenberg })
  const photo = await photoJpeg(0)
  const full = await buildPage(card, shared, photo)
  const blank = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"/>'
  )
  const svgBlank = (name: string): PdfAsset => ({
    name,
    content: blank,
    contentType: "image/svg+xml",
  })
  const tinyJpeg = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .jpeg()
    .toBuffer()
  const variants: [string, PdfPage][] = [
    ["full card", full],
    [
      "without the photo",
      {
        ...full,
        assets: full.assets.map((a) =>
          a.name === "photo.jpg"
            ? { ...a, content: new Uint8Array(tinyJpeg) }
            : a
        ),
      },
    ],
    [
      "without logo, stamp and signatures",
      {
        ...full,
        assets: full.assets.map((a) =>
          a.name.endsWith(".svg") ? svgBlank(a.name) : a
        ),
      },
    ],
    [
      "without the QR code",
      {
        ...full,
        html: full.html.replace(
          /<div class="qr">[\s\S]*?<\/svg><\/div>/,
          '<div class="qr"></div>'
        ),
      },
    ],
    [
      "photo at JPEG quality 85",
      { ...full, assets: full.assets.map((a) => a) },
    ],
  ]
  const q85 = await photoJpeg(0, 85)
  const last = variants[4]
  if (last !== undefined)
    last[1] = {
      ...full,
      assets: full.assets.map((a) => (a.name === "photo.jpg" ? q85 : a)),
    }
  console.log(
    `photo JPEG: ${kib(photo.content.length)} at quality 72, ${kib(q85.content.length)} at quality 85`
  )
  // The brand fonts (Figtree body, Merriweather headings), sent with the card when
  // --fonts-dir points at figtree.woff2 and merriweather.woff2.
  const fontsDir = arg("fonts-dir")
  if (fontsDir !== undefined) {
    const font = (name: string): PdfAsset => ({
      name,
      content: readFileSync(join(fontsDir, name)),
      contentType: "font/woff2",
    })
    const faces = `@font-face{font-family:Figtree;src:url(figtree.woff2) format("woff2");font-weight:300 900}@font-face{font-family:Merriweather;src:url(merriweather.woff2) format("woff2");font-weight:300 900}body{font-family:Figtree,sans-serif}h1,h2{font-family:Merriweather,serif}`
    variants.push([
      "with the brand fonts (Figtree, Merriweather)",
      {
        html: full.html.replace("</style>", `${faces}</style>`),
        assets: [
          ...full.assets,
          font("figtree.woff2"),
          font("merriweather.woff2"),
        ],
      },
    ])
  }
  for (const [name, page] of variants) {
    const pdf = await renderer.render(page)
    console.log(`${name.padEnd(40)} ${kib(pdf.length)}`)
  }
}

/** One card as a PDF, and as greyscale and colour images, for the founder to judge. */
async function runPreview(): Promise<void> {
  const card = buildSchool()[0]
  if (card === undefined) return
  const shared = sharedAssets(card)
  const page = await buildPage(card, shared, await photoJpeg(0))
  mkdirSync(options.out, { recursive: true })
  const renderer = createGotenbergRenderer({ baseUrl: options.gotenberg })
  writeFileSync(join(options.out, "preview.pdf"), await renderer.render(page))
  const form = new FormData()
  form.append(
    "files",
    new Blob([page.html], { type: "text/html" }),
    "index.html"
  )
  for (const a of page.assets)
    form.append(
      "files",
      new Blob([new Uint8Array(a.content)], { type: a.contentType }),
      a.name
    )
  // The printable area of A4 with 0.35-inch margins, in CSS pixels (96 per inch), and
  // print styles, so the image wraps text exactly as the PDF does.
  form.append("width", "727")
  form.append("height", "1056")
  form.append("emulatedMediaType", "print")
  form.append("format", "png")
  const response = await fetch(
    `${options.gotenberg}/forms/chromium/screenshot/html`,
    { method: "POST", body: form }
  )
  const png = Buffer.from(await response.arrayBuffer())
  writeFileSync(join(options.out, "preview-colour.png"), png)
  await sharp(png)
    .greyscale()
    .toFile(join(options.out, "preview-greyscale.png"))
  console.log(`preview written to ${options.out}`)
}

const mode =
  arg("breakdown") === "true"
    ? runBreakdown
    : arg("preview") === "true"
      ? runPreview
      : runBatch
await mode()
