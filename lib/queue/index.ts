/**
 * lib/queue/index.ts — BullMQ Queue definitions.
 *
 * Exports the queue instances used to enqueue messages.
 * Workers are defined separately in worker.ts and run in the bot process.
 *
 * Queue: "ingestion-discord"
 *   - Backed by REDIS_URL (same Redis instance as pub/sub)
 *   - Per-thread sequential processing is enforced in the worker via
 *     job name = "msg:{threadId}" so BullMQ rate-limiter / concurrency
 *     can gate per-thread ordering.
 */

import { Queue } from "bullmq";
import type { NormalizedMessage } from "@/types/pipeline";

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/** Parse a Redis URL into the host/port/password config BullMQ expects. */
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    // Fallback for bare "host:port" strings without protocol
    return { host: "localhost", port: 6379 };
  }
}

export const redisConnection = parseRedisUrl(REDIS_URL);

// ---------------------------------------------------------------------------
// Queue job types
// ---------------------------------------------------------------------------

export interface DiscordIngestionJobData {
  normalized: NormalizedMessage;
  /** Enqueue timestamp (ms) — used for latency monitoring. */
  enqueuedAt: number;
}

// ---------------------------------------------------------------------------
// Queue instances
// ---------------------------------------------------------------------------

// Singleton pattern: reuse across hot-reloads in Next.js dev mode.
const globalQueues = global as unknown as {
  discordIngestionQueue?: Queue<DiscordIngestionJobData>;
};

export const discordIngestionQueue: Queue<DiscordIngestionJobData> =
  globalQueues.discordIngestionQueue ??
  new Queue<DiscordIngestionJobData>("ingestion-discord", {
    connection: redisConnection,
    defaultJobOptions: {
      // Keep completed jobs for 24 h for debugging; failed jobs for 7 days.
      removeOnComplete: { age: 86_400 },
      removeOnFail: { age: 604_800 },
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalQueues.discordIngestionQueue = discordIngestionQueue;
}
