/**
 * Structured Logging Utility
 *
 * Provides consistent JSON logging for observability and debugging.
 * All logs include timestamp, level, and contextual metadata.
 */

export interface LogContext {
  requestId?: string;
  campaignId?: string;
  donationId?: string;
  wallet?: string;
  donorWallet?: string;
  creatorWallet?: string;
  cluster?: string;
  amount?: number;
  amountLamports?: string;
  txSignature?: string;
  error?: string;
  errorCode?: string;
  durationMs?: number;
  statusCode?: number;
  path?: string;
  method?: string;
  ip?: string;
  status?: string;
  progressPercent?: number;
  expiredCount?: number;
  // Security/Auth related
  email?: string;
  actorEmail?: string;
  targetEmail?: string;
  resourceType?: string;
  resourceId?: string;
  attempts?: number;
  limit?: number;
  prefix?: string;
  identifier?: string;
  count?: number;
  unlocksAt?: string;
  lockedUntil?: string;
  adminAction?: string;
  action?: string;
}

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  env: string | undefined;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Structured logger with JSON output
 *
 * @param level - Log level (debug, info, warn, error)
 * @param message - Human-readable message
 * @param context - Contextual metadata for filtering/searching
 */
export function log(
  level: LogLevel,
  message: string,
  context: Partial<LogContext> = {}
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "blinkfund",
    env: process.env.NODE_ENV,
    ...context,
  };

  // Remove undefined values for cleaner logs
  const cleanEntry = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined)
  );

  const jsonLine = JSON.stringify(cleanEntry);

  switch (level) {
    case "error":
      console.error(jsonLine);
      break;
    case "warn":
      console.warn(jsonLine);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(jsonLine);
      }
      break;
    default:
      console.log(jsonLine);
  }
}

/**
 * Log an API request start
 */
export function logRequest(
  method: string,
  path: string,
  context: Partial<LogContext> = {}
): void {
  log("info", `${method} ${path}`, {
    method,
    path,
    ...context,
  });
}

/**
 * Log an API response
 */
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context: Partial<LogContext> = {}
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, {
    method,
    path,
    statusCode,
    durationMs,
    ...context,
  });
}

/**
 * Log a donation event
 */
export function logDonation(
  event: "created" | "confirmed" | "failed",
  context: Partial<LogContext>
): void {
  const level = event === "failed" ? "error" : "info";
  log(level, `Donation ${event}`, {
    ...context,
  });
}

/**
 * Log a transaction event
 */
export function logTransaction(
  event: "building" | "built" | "submitted" | "confirmed" | "failed",
  context: Partial<LogContext>
): void {
  const level = event === "failed" ? "error" : "info";
  log(level, `Transaction ${event}`, {
    ...context,
  });
}

/**
 * Measure and log execution time
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  context: Partial<LogContext> = {}
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    log("info", `${operation} completed`, { ...context, durationMs });
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    log("error", `${operation} failed`, {
      ...context,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
