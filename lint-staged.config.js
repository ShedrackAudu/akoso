import path from "node:path"

// Files are checked in small batches with relative paths. Windows limits a command
// line to about 8,000 characters, which a large commit overflows otherwise.
const BATCH_SIZE = 40

/**
 * @param {string[]} files absolute paths from lint-staged
 * @returns {string[]} one quoted, space-separated argument string per batch
 */
function toBatches(files) {
  const relative = files.map(
    (file) => `"${path.relative(process.cwd(), file).replaceAll("\\", "/")}"`
  )
  const batches = []
  for (let start = 0; start < relative.length; start += BATCH_SIZE) {
    batches.push(relative.slice(start, start + BATCH_SIZE).join(" "))
  }
  return batches
}

// The hook checks formatting but never rewrites staged files.
export default {
  "*.{ts,tsx,js,mjs,cjs}": (files) =>
    toBatches(files).flatMap((batch) => [
      `eslint --max-warnings 0 --no-warn-ignored ${batch}`,
      `prettier --check ${batch}`,
    ]),
  "*.{json,md,css,yml,yaml}": (files) =>
    toBatches(files).map((batch) => `prettier --check ${batch}`),
}
