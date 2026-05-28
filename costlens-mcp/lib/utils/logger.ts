import pino from "pino";

/**
 * Structured JSON logger. Single instance reused across the app.
 * Use `logger.child({ context })` to scope logs to a request or tool call.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    service: "costlens-mcp"
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
