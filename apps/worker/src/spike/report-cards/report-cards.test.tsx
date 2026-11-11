import { describe, expect, it } from "vitest"

import { createFakePdfRenderer } from "@akoso/providers/pdf"

import { buildSchool, ordinal } from "./data"
import { buildPage, cacheKey, type SharedAssets } from "./render"
import { zip } from "./zip"

const svg = (name: string): SharedAssets["logo"] => ({
  name,
  content: new TextEncoder().encode(
    "<svg xmlns='http://www.w3.org/2000/svg'/>"
  ),
  contentType: "image/svg+xml",
})
const shared: SharedAssets = {
  logo: svg("logo.svg"),
  stamp: svg("stamp.svg"),
  teacherSignature: svg("sig-teacher.svg"),
  principalSignature: svg("sig-principal.svg"),
}
const photo = {
  name: "photo.jpg",
  content: new Uint8Array([1, 2, 3]),
  contentType: "image/jpeg",
}

describe("spike 03 report cards", () => {
  it("builds 600 cards", () => {
    expect(buildSchool()).toHaveLength(600)
  })

  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [42, "42nd"],
    [111, "111th"],
  ])("writes %i as %s", (n, text) => {
    expect(ordinal(n)).toBe(text)
  })

  it("gives the same card the same cache key, and a changed card a new one", async () => {
    const [first, second] = buildSchool()
    if (first === undefined || second === undefined) throw new Error("no cards")
    const a = await buildPage(first, shared, photo)
    const again = await buildPage(first, shared, photo)
    const other = await buildPage(second, shared, photo)
    expect(cacheKey(a)).toBe(cacheKey(again))
    expect(cacheKey(a)).not.toBe(cacheKey(other))
  })

  it("escapes text, so a comment cannot inject HTML into the card", async () => {
    const [card] = buildSchool()
    if (card === undefined) throw new Error("no cards")
    const hostile = {
      ...card,
      comments: { ...card.comments, formTeacher: "<script>alert(1)</script>" },
    }
    const page = await buildPage(hostile, shared, photo)
    expect(page.html).not.toContain("<script>alert(1)</script>")
    expect(page.html).toContain("&lt;script&gt;")
  })

  it("sends every asset with the page, and the footer says Akoso prepared it", async () => {
    const [card] = buildSchool()
    if (card === undefined) throw new Error("no cards")
    const renderer = createFakePdfRenderer()
    await renderer.render(await buildPage(card, shared, photo))
    const page = renderer.rendered[0]
    expect(page?.assets.map((a) => a.name).sort()).toEqual(
      [
        "logo.svg",
        "photo.jpg",
        "sig-principal.svg",
        "sig-teacher.svg",
        "stamp.svg",
      ].sort()
    )
    expect(page?.html).toContain("Results prepared with Akoso")
  })

  it("writes a zip whose entries can be found again", () => {
    const archive = zip([
      { name: "JSS 1A/one.pdf", content: new TextEncoder().encode("%PDF-a") },
      { name: "JSS 1A/two.pdf", content: new TextEncoder().encode("%PDF-bb") },
    ])
    // End-of-central-directory record: signature, then the entry count at offset 10.
    const end = archive.length - 22
    expect(archive.readUInt32LE(end)).toBe(0x06054b50)
    expect(archive.readUInt16LE(end + 10)).toBe(2)
    expect(archive.includes(Buffer.from("JSS 1A/two.pdf"))).toBe(true)
  })
})
