/**
 * index.ts — Bystander Discord bot entrypoint.
 *
 * Responsibilities:
 *  1. Log in to the Discord Gateway using DISCORD_BOT_TOKEN.
 *  2. Listen for messageCreate events and forward each message to the
 *     Bystander API's /api/ingestion/discord endpoint.
 *  3. Retry transient network errors without crashing the process.
 *
 * This process intentionally does NO NLP, scoring, or mediation logic.
 * It is a thin forwarding layer only.
 */

import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
} from "discord.js";
import { startNotifyServer } from "./server";
// ⚠️  Worker import — the BullMQ worker MUST run in this persistent process,
// not as a Vercel serverless function (which terminates after each request).
// The bot process is always-on, making it the correct host for queue workers.
import { createIngestionWorker } from "../lib/queue/worker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BYSTANDER_API_URL = process.env.BYSTANDER_API_URL;

if (!DISCORD_BOT_TOKEN) {
  console.error(
    "[bot] DISCORD_BOT_TOKEN is not set. Exiting."
  );
  process.exit(1);
}

if (!BYSTANDER_API_URL) {
  console.error(
    "[bot] BYSTANDER_API_URL is not set. Exiting."
  );
  process.exit(1);
}

/** Full URL for the Discord ingestion endpoint. */
const INGESTION_ENDPOINT = `${BYSTANDER_API_URL.replace(/\/$/, "")}/api/ingestion/discord`;

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * POST JSON to a URL with simple exponential back-off on transient failures.
 * Never throws — logs and returns false on permanent failure so the bot
 * keeps running.
 */
async function postWithRetry(
  url: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return true;
      }

      // 4xx errors are not transient — log and give up immediately.
      if (res.status >= 400 && res.status < 500) {
        const text = await res.text().catch(() => "(unreadable body)");
        console.error(
          `[bot] Ingestion endpoint returned ${res.status} (non-retryable): ${text}`
        );
        return false;
      }

      // 5xx — treat as transient.
      console.warn(
        `[bot] Ingestion endpoint returned ${res.status} on attempt ${attempt}/${MAX_RETRIES}. Retrying…`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[bot] Network error on attempt ${attempt}/${MAX_RETRIES}: ${msg}. Retrying…`
      );
    }

    // Exponential back-off: 500 ms, 1 s, 2 s…
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await sleep(delay);
  }

  console.error(`[bot] Giving up forwarding message after ${MAX_RETRIES} attempts.`);
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    // Required to receive messages in servers and DMs.
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] Logged in as ${readyClient.user.tag}`);
  console.log(`[bot] Forwarding messages to ${INGESTION_ENDPOINT}`);
  // Start the internal DM-delivery HTTP server (POST /notify).
  // Runs in the same process so it can reuse the already-authenticated client.
  startNotifyServer(readyClient);
  // Start the BullMQ ingestion worker. This is the consumer side of the
  // async queue: validates → NLP → prediction → mediation → DB write.
  // concurrency=1 ensures sequential per-thread ordering.
  const worker = createIngestionWorker();
  console.log(`[bot] Ingestion worker started (queue: ingestion-discord)`);
  // Graceful shutdown: close worker before the process exits.
  process.once("SIGTERM", async () => {
    console.log("[bot] SIGTERM received — closing worker and Discord client");
    await worker.close();
    await client.destroy();
    process.exit(0);
  });
});

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore messages sent by bots (including ourselves) to avoid loops.
  if (message.author.bot) return;

  // Build the raw payload that matches the DiscordPayloadSchema expected by
  // /api/ingestion/discord. The server side owns normalization into
  // NormalizedMessage — we just supply the raw Discord fields.
  const payload = {
    channel_id: message.channelId,
    author: {
      id: message.author.id,
      username: message.author.username,
    },
    content: message.content,
    timestamp: message.createdAt.toISOString(),
  };

  const ok = await postWithRetry(INGESTION_ENDPOINT, payload);

  if (!ok) {
    // Already logged inside postWithRetry. Don't throw — keep the bot alive.
    return;
  }

  // Verbose-level log; remove or gate behind LOG_LEVEL env var in production.
  console.log(
    `[bot] Forwarded message from ${message.author.username} in channel ${message.channelId}`
  );
});

// ---------------------------------------------------------------------------
// Error & reconnect handling
// ---------------------------------------------------------------------------

client.on(Events.Error, (err) => {
  // discord.js emits errors on the client rather than crashing; log them.
  console.error("[bot] Discord client error:", err.message);
});

// Discord.js handles WebSocket reconnects automatically. The ShardDisconnect
// event fires when a shard disconnects; log it so ops can see if it's frequent.
client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
  console.warn(
    `[bot] Shard ${shardId} disconnected (code ${closeEvent.code}). discord.js will attempt to reconnect automatically.`
  );
});

client.on(Events.ShardReconnecting, (shardId) => {
  console.log(`[bot] Shard ${shardId} reconnecting…`);
});

client.on(Events.ShardResume, (shardId, replayed) => {
  console.log(`[bot] Shard ${shardId} resumed. Replayed ${replayed} events.`);
});

// Catch unhandled promise rejections so they don't silently swallow errors.
process.on("unhandledRejection", (reason) => {
  console.error("[bot] Unhandled promise rejection:", reason);
  // Do NOT exit — let discord.js keep the connection alive.
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

client.login(DISCORD_BOT_TOKEN).catch((err) => {
  console.error("[bot] Failed to log in:", err);
  process.exit(1);
});

// Export the client so notify.ts or tests can share this instance if needed.
export { client };
