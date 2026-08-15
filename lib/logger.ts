/**
 * lib/logger.ts — Pino structured logger singleton.
 *
 * In development: pretty-printed, human-readable output via pino-pretty.
 * In production: JSON lines, parseable by log aggregators (Datadog, etc.).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   const log = logger.child({ module: "ingestion" });
 *   log.info({ threadId }, "Message enqueued");
 *   log.error({ err }, "Pipeline failed");
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const level = (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info";

export const logger = pino({
  level,
  // Redact any field that might contain raw user text or secrets.
  redact: {
    paths: [
      "*.rawText",
      "*.text",
      "*.content",
      "*.password",
      "*.secret",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        // In production, emit structured JSON. Timestamps in epoch ms for
        // ingest efficiency; log aggregators can convert to ISO on their end.
        timestamp: pino.stdTimeFunctions.epochTime,
      }),
});

export type Logger = typeof logger;
