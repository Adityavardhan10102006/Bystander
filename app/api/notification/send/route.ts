import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Delivers nudges privately (DM) back to the sender on the source platform.
// Escalation levels 1-4 map to urgency/tone of delivery, never posted
// publicly in the original channel/thread.

const BodySchema = z.object({
  platformUserId: z.string(),
  platform: z.enum(["DISCORD", "SLACK", "TEAMS", "WHATSAPP", "TELEGRAM", "GOOGLE_CHAT"]),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO(Phase 2): dispatch via platform-specific client (discord.js DM,
  // Slack chat.postMessage to user, etc.) based on parsed.data.platform.
  console.log("Would deliver private nudge:", parsed.data);

  return NextResponse.json({ status: "sent" });
}
