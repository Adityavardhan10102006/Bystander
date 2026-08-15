import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { NormalizedMessage } from "@/types/pipeline";
import { discordIngestionQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";

// First chat-platform integration (per confirmed scope). Normalizes Discord
// payloads into the internal message format so other platforms (Slack,
// Teams, etc.) can plug in later without touching downstream pipeline code.
//
// Phase 1: validate + enqueue immediately, return 200 in <300ms p95.
// All heavy processing (NLP, AI, DB writes) runs in the BullMQ worker
// that lives inside the bot process.

const log = logger.child({ module: "api/ingestion/discord" });

const DiscordPayloadSchema = z.object({
  channel_id: z.string().min(1),
  author: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
  }),
  content: z.string(),
  timestamp: z.string(),
});

export async function POST(req: NextRequest) {
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
    platform: "DISCORD",
    platformUserId: parsed.data.author.id,
    // PII constraint: only the Discord username (display name), never email/PII.
    displayName: parsed.data.author.username,
    text: parsed.data.content,
    sentAt: parsed.data.timestamp,
  };

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
      { error: "Failed to enqueue message", detail: message },
      { status: 503 }
    );
  }

  log.info(
    { threadId: normalized.externalThreadId, platform: "DISCORD" },
    "Message enqueued"
  );

  return NextResponse.json({ status: "queued" }, { status: 200 });
}
