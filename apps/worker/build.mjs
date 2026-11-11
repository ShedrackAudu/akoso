// Bundles the worker for Node (tech debt T2, settled in spike 03).
//
// Node 24 can run TypeScript, but not our workspace packages: they import each other
// without file extensions, which Node's loader refuses. So the worker is bundled with
// esbuild. Our own packages (@akoso/*) are compiled into the bundle; every other
// package stays external and loads from node_modules as usual.
import { build, context } from "esbuild"

const watch = process.argv.includes("--watch")

/** @type {import("esbuild").Plugin} */
const keepThirdPartyExternal = {
  name: "keep-third-party-external",
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) =>
      args.path.startsWith("@akoso/")
        ? undefined
        : { path: args.path, external: true }
    )
  },
}

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: {
    index: "src/index.ts",
    "spike-report-cards": "src/spike/report-cards/batch.tsx",
  },
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  jsx: "automatic",
  sourcemap: true,
  logLevel: "info",
  plugins: [keepThirdPartyExternal],
}

if (watch) {
  await (await context(options)).watch()
} else {
  await build(options)
}
