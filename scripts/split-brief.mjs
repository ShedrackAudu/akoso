import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs"
import { join } from "node:path"
const [src, outDir] = process.argv.slice(2)
const buf = readFileSync(src, "utf8")
const lines = buf.split("\n")
const starts = []
lines.forEach((l, i) => {
  const m = /^## (\d+)\. (.+)$/.exec(l)
  if (m) starts.push({ i, n: Number(m[1]), title: m[2].trim() })
})
const slug = (t) =>
  t
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
mkdirSync(outDir, { recursive: true })
const parts = [
  {
    file: "00-introduction-and-key-terms.md",
    n: 0,
    title: "Introduction, how the brief is organised, and key terms",
    from: 0,
  },
]
for (const s of starts)
  parts.push({
    file: `${String(s.n).padStart(2, "0")}-${slug(s.title)}.md`,
    n: s.n,
    title: s.title,
    from: s.i,
  })
parts.forEach((p, k) => {
  const to = k + 1 < parts.length ? parts[k + 1].from : lines.length
  p.text =
    lines.slice(p.from, to).join("\n") + (k + 1 < parts.length ? "\n" : "")
  writeFileSync(join(outDir, p.file), p.text)
})
const joined = parts.map((p) => p.text).join("")
if (joined !== buf) {
  console.error("ROUND TRIP FAILED")
  process.exit(1)
}
const expected = Array.from({ length: 44 }, (_, k) => k + 1)
const got = starts.map((s) => s.n)
if (JSON.stringify(expected) !== JSON.stringify(got)) {
  console.error("SECTION NUMBERS UNEXPECTED", got)
  process.exit(1)
}
const row = (p) => `| ${p.n === 0 ? "—" : p.n} | [${p.title}](${p.file}) |`
const idx = `# Brief index

The Akoso brief (\`docs/MASTER_PROMPT.md\`) split into one file per section, unchanged.
Load only the sections you need for the current task (working rule 13).

- **Source of truth:** \`docs/MASTER_PROMPT.md\`. If a file here ever disagrees with it, the master prompt wins and the difference is a bug.
- **Do not edit these files by hand.** Change the master prompt, then regenerate them with the split script (see \`AGENTS.md\`), in the same pull request.
- Joining these files in order reproduces the master prompt byte for byte. Because of that, the \`# Part 1\` heading sits at the end of file 00 and the \`# Part 2\` heading at the end of file 34.
- Subsections stay with their parent (e.g. 3.1–3.3 are in file 03, 25.1 in file 25, 28.1–28.4 in file 28).

## Part 1: Core platform

| Section | File |
| --- | --- |
${parts
  .filter((p) => p.n <= 34)
  .map(row)
  .join("\n")}

## Part 2: Optional modules (do not build until instructed)

| Section | File |
| --- | --- |
${parts
  .filter((p) => p.n >= 35)
  .map(row)
  .join("\n")}
`
writeFileSync(join(outDir, "README.md"), idx)
console.log("OK", parts.length, "files;", readdirSync(outDir).length, "entries")
