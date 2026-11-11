import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** Runs SQL as the local superuser inside the Docker Postgres container. */
export function runSqlAsOwner(sqlText: string): void {
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "akoso_owner",
      "-d",
      "akoso_dev",
    ],
    { input: sqlText, stdio: ["pipe", "ignore", "inherit"] }
  )
}

/** Runs one query as the local superuser and returns its rows as tab-separated text. */
export function querySqlAsOwner(sqlText: string): string[][] {
  const output = execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-A",
      "-t",
      "-F",
      "\t",
      "-U",
      "akoso_owner",
      "-d",
      "akoso_dev",
      "-c",
      sqlText,
    ],
    { encoding: "utf8" }
  )
  return output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\t"))
}

// Spike 02: start every run from an empty offline schema.
export default function globalSetup(): void {
  runSqlAsOwner(
    readFileSync(
      join(process.cwd(), "packages/db/src/spike/offline-schema.sql"),
      "utf8"
    )
  )
}
