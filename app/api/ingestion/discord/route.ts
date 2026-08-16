import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { NormalizedMessage } from "@/types/pipeline";
import { discordIngestionQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

// First chat-platform integration. Normalizes Discord payloads into the
// internal message format so other platforms can plug in later without
// touching downstream pipeline code.
//
// Security: REQUIRES Authorization: Bearer <INGESTION_SECRET>.
// The secret is shared between the Discord bot and this API.
// Security FAILS CLOSED: if INGESTION_SECRET is not configured, ALL
// requests are rejected (the server must be properly configured).

const log = logger.child({ module: "api/ingestion/discord" });

const INGESTION_SECRET = process.env.INGESTION_SECRET;

const DiscordPayloadSchema = z.object({
  channel_id: z.string().min(1),
  guild_id: z.string().min(1).optional(), // Discord guild snowflake
  author: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
  }),
  content: z.string(),
  timestamp: z.string(),
  // Optional: external message ID for deduplication
  message_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // ── Authentication — fail CLOSED ─────────────────────────────────────────
  // If the secret is not configured, reject all requests. Never bypass auth.
  if (!INGESTION_SECRET) {
    log.error("INGESTION_SECRET is not configured — rejecting request");
    return NextResponse.json(
      { error: "Service misconfigured — ingestion is disabled" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${INGESTION_SECRET}`) {
    log.warn({ hasAuth: !!authHeader }, "Ingestion request rejected: invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DiscordPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const normalized: NormalizedMessage = {
    externalThreadId: parsed.data.channel_id,
    guildId: parsed.data.guild_id,
    platform: "DISCORD",
    platformUserId: parsed.data.author.id,
    // PII constraint: only the Discord username (display name), never email/PII.
    displayName: parsed.data.author.username,
    text: parsed.data.content,
    sentAt: parsed.data.timestamp,
    externalMessageId: parsed.data.message_id,
  };

  // Skip empty messages (bot commands, etc.)
  if (!normalized.text.trim()) {
    return NextResponse.json({ status: "skipped", reason: "empty_content" }, { status: 200 });
  }

  try {
    await discordIngestionQueue.add(
      `msg:${normalized.externalThreadId}`,
      {
        normalized,
        enqueuedAt: Date.now(),
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, "Failed to enqueue discord message");
    return NextResponse.json(
      { error: "Failed to enqueue message" },
      { status: 503 }
    );
  }

  log.info(
    { threadId: normalized.externalThreadId, platform: "DISCORD" },
    "Message enqueued"
  );

  return NextResponse.json({ status: "queued" }, { status: 200 });
}
