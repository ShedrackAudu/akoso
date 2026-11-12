// Structured logs: one JSON line per event (ARCHITECTURE.md section 11). The fields are
// a fixed list on purpose. There is no way to log a request body, query string, token,
// phone number or name, because the types do not accept them (brief section 28).

/** Fields every line from a request or job carries. */
export interface LogContext {
  requestId?: string
  tenantId?: string | null
  userId?: string | null
  job?: string
}

/** What a single line may add. Nothing free-form beyond `msg`. */
export interface LogFields {
  route?: string
  method?: string
  status?: number
  durationMs?: number
  code?: string
  rateLimit?: string
  replayed?: boolean
}

type LogLevel = "info" | "warn" | "error"

export interface Logger {
  info(msg: string, fields?: LogFields): void
  warn(msg: string, fields?: LogFields): void
  /** For bugs: logs the error's name, message and stack, nothing it might carry. */
  error(msg: string, error: unknown, fields?: LogFields): void
  child(context: LogContext): Logger
}

export type LogSink = (line: string) => void

// stdout, where the hosting platform collects logs.
const STDOUT_SINK: LogSink = (line) => {
  process.stdout.write(`${line}\n`)
}

/**
 * Creates a logger. `now` and `sink` are injectable so tests can read exactly what
 * would have been written.
 */
export function createLogger(
  context: LogContext = {},
  sink: LogSink = STDOUT_SINK,
  now: () => Date = () => new Date()
): Logger {
  const write = (
    level: LogLevel,
    msg: string,
    fields: LogFields = {},
    error?: unknown
  ) => {
    const line: Record<string, unknown> = {
      time: now().toISOString(),
      level,
      msg,
      ...context,
      ...fields,
    }
    if (error !== undefined) {
      line.error =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { name: typeof error }
    }
    sink(JSON.stringify(line))
  }
  return {
    info: (msg, fields) => {
      write("info", msg, fields)
    },
    warn: (msg, fields) => {
      write("warn", msg, fields)
    },
    error: (msg, error, fields) => {
      write("error", msg, fields, error)
    },
    child: (extra) => createLogger({ ...context, ...extra }, sink, now),
  }
}
