import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { NormalizedMessage } from "@/types/pipeline";
import { prisma } from "@/lib/db/client";

// First chat-platform integration (per confirmed scope). Normalizes Discord
// payloads into the internal message format so other platforms (Slack,
// Teams, etc.) can plug in later without touching downstream pipeline code.

const DiscordPayloadSchema = z.object({
  channel_id: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
  }),
  content: z.string(),
  timestamp: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = DiscordPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const normalized: NormalizedMessage = {
    externalThreadId: parsed.data.channel_id,
    platform: "DISCORD",
    platformUserId: parsed.data.author.id,
    displayName: parsed.data.author.username,
    text: parsed.data.content,
    sentAt: parsed.data.timestamp,
  };

  // TODO(Phase 2): push `normalized` onto the Redis queue for async
  // NLP -> prediction -> nudge processing, rather than processing inline here.
  // Kept as a direct DB touch-point stub for now so the route is runnable.

  return NextResponse.json({ status: "queued", normalized }, { status: 202 });
}
