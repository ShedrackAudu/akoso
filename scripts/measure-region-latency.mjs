// Measures network latency from this computer to candidate hosting regions, for the
// hosting-region decision (D-OPEN-1; brief section 31: "chosen by measured latency
// from Lagos, Abuja and Port Harcourt").
//
//   pnpm latency:regions             # 20 rounds, prints a table
//   pnpm latency:regions -- 40       # more rounds
//
// For each region it times a TCP connection to a public endpoint inside that region.
// One TCP connection takes one network round trip, so this is close to ping. Every
// page load also pays a TLS handshake and the app's own time on top. The regions are
// tried in turn within each round, so a slow moment on the line affects them all
// alike. Run it at different times of day (morning, evening peak) and on the
// connections schools use (mobile data, office broadband). Nothing is sent but a TCP
// handshake, and nothing about this computer is recorded.
import net from "node:net"

// Public, region-specific AWS endpoints. Managed hosts run in or near these places:
// Render's Frankfurt region, Fly.io's Frankfurt, London and Johannesburg regions.
// AWS Cape Town stands in for southern Africa; Fly.io's Johannesburg is a separate
// site and cannot be targeted this way.
const REGIONS = [
  { name: "AWS Cape Town (af-south-1)", host: "ec2.af-south-1.amazonaws.com" },
  { name: "AWS London (eu-west-2)", host: "ec2.eu-west-2.amazonaws.com" },
  {
    name: "AWS Frankfurt (eu-central-1)",
    host: "ec2.eu-central-1.amazonaws.com",
  },
  { name: "AWS Ireland (eu-west-1)", host: "ec2.eu-west-1.amazonaws.com" },
  { name: "AWS Paris (eu-west-3)", host: "ec2.eu-west-3.amazonaws.com" },
]

const ROUNDS = Number(process.argv[2] ?? 20)
const TIMEOUT_MS = 5000

function connectTime(host) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint()
    const socket = net.connect({ host, port: 443 })
    const done = (ms) => {
      socket.destroy()
      resolve(ms)
    }
    socket.setTimeout(TIMEOUT_MS, () => done(null))
    socket.once("error", () => done(null))
    socket.once("connect", () =>
      done(Number(process.hrtime.bigint() - started) / 1e6)
    )
  })
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]

const samples = new Map(REGIONS.map((r) => [r.host, []]))
// One connection first to each, so DNS lookups are not counted.
await Promise.all(REGIONS.map((r) => connectTime(r.host)))
for (let round = 0; round < ROUNDS; round++) {
  for (const region of REGIONS) {
    samples.get(region.host).push(await connectTime(region.host))
  }
}

console.log(
  `Measured ${new Date().toISOString()}, ${String(ROUNDS)} rounds (milliseconds)\n`
)
console.log("| Region | Median | 90th percentile | Failed |")
console.log("| --- | --- | --- | --- |")
const rows = REGIONS.map((region) => {
  const all = samples.get(region.host)
  const ok = all.filter((ms) => ms !== null).sort((a, b) => a - b)
  return { region, ok, failed: all.length - ok.length }
}).sort(
  (a, b) =>
    (percentile(a.ok, 0.5) ?? Infinity) - (percentile(b.ok, 0.5) ?? Infinity)
)
for (const { region, ok, failed } of rows) {
  const fmt = (ms) => (ms === undefined ? "n/a" : ms.toFixed(0))
  console.log(
    `| ${region.name} | ${fmt(percentile(ok, 0.5))} | ${fmt(percentile(ok, 0.9))} | ${String(failed)} |`
  )
}
