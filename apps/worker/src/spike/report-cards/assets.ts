// Spike 03 only. Made-up images for the report cards: never a real school, person or
// child. Photos are generated, not drawn from anywhere.
import QRCode from "qrcode"
import sharp from "sharp"

import type { PdfAsset } from "@akoso/providers/pdf"

const PHOTO = { width: 240, height: 300 }

/** The school's logo: a simple made-up crest, as SVG (decision D-5: logos as SVG). */
export function logoSvg(colour: string): PdfAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <path d="M50 4 L94 20 V58 C94 88 72 106 50 116 C28 106 6 88 6 58 V20 Z" fill="${colour}"/>
  <path d="M50 14 L84 27 V58 C84 82 67 97 50 105 C33 97 16 82 16 58 V27 Z" fill="none" stroke="#fff" stroke-width="3"/>
  <path d="M30 70 L50 40 L70 70 Z" fill="#E8C547"/><circle cx="50" cy="78" r="8" fill="#fff"/>
  <text x="50" y="98" font-family="Noto Serif" font-size="9" text-anchor="middle" fill="#fff">GMC</text>
</svg>`
  return {
    name: "logo.svg",
    content: new TextEncoder().encode(svg),
    contentType: "image/svg+xml",
  }
}

/** A signature-like scribble, as SVG. */
export function signatureSvg(name: string, seed: number): PdfAsset {
  const points = Array.from({ length: 9 }, (_, i) => {
    const x = 6 + i * 22
    const y = 30 + Math.sin(seed + i * 1.7) * 14
    return `${String(x)},${y.toFixed(1)}`
  }).join(" ")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><polyline points="${points}" fill="none" stroke="#1a237e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return {
    name,
    content: new TextEncoder().encode(svg),
    contentType: "image/svg+xml",
  }
}

/** A round school stamp, as SVG. */
export function stampSvg(schoolName: string): PdfAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="56" fill="none" stroke="#b71c1c" stroke-width="4" opacity=".8"/>
  <circle cx="60" cy="60" r="42" fill="none" stroke="#b71c1c" stroke-width="2" opacity=".8"/>
  <text x="60" y="56" font-family="Noto Sans" font-size="11" font-weight="700" text-anchor="middle" fill="#b71c1c" opacity=".85">${schoolName.split(" ")[0] ?? ""}</text>
  <text x="60" y="72" font-family="Noto Sans" font-size="9" text-anchor="middle" fill="#b71c1c" opacity=".85">OFFICIAL</text>
</svg>`
  return {
    name: "stamp.svg",
    content: new TextEncoder().encode(svg),
    contentType: "image/svg+xml",
  }
}

/**
 * A stand-in passport photo: blurred noise with a soft head-and-shoulders shape, so
 * the JPEG compresses about like a real photo rather than like a flat drawing.
 */
export async function photoJpeg(seed: number, quality = 72): Promise<PdfAsset> {
  const tone = 90 + ((seed * 37) % 80)
  const silhouette = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(PHOTO.width)}" height="${String(PHOTO.height)}">
    <rect width="100%" height="100%" fill="rgb(${String(180 + (seed % 40))},${String(200 - (seed % 30))},230)" opacity=".55"/>
    <ellipse cx="120" cy="120" rx="58" ry="72" fill="rgb(${String(tone)},${String(tone - 30)},${String(tone - 55)})" opacity=".9"/>
    <ellipse cx="120" cy="300" rx="110" ry="90" fill="rgb(40,60,${String(100 + (seed % 90))})" opacity=".9"/>
  </svg>`
  const noise = await sharp({
    create: {
      width: PHOTO.width,
      height: PHOTO.height,
      channels: 3,
      background: "#808080",
      noise: { type: "gaussian", mean: 128, sigma: 40 },
    },
  })
    .png()
    .toBuffer()
  const content = await sharp(noise)
    .composite([{ input: Buffer.from(silhouette), blend: "over" }])
    .blur(1.2)
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()
  return {
    name: "photo.jpg",
    content: new Uint8Array(content),
    contentType: "image/jpeg",
  }
}

/** The verification QR code, as inline SVG (vector: tiny and sharp when printed). */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  })
}
