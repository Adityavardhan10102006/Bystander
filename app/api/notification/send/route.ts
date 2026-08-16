import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { hasTeamAccess } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

// Delivers nudges privately (DM) to a Discord user via the bot's notify server.
//
// Security:
//   - Requires authenticated session
//   - Requires ADMIN or MODERATOR role for the specified team
//   - Calls the bot's internal notify server (POST http://...:3001/notify)
//     with NOTIFY_SECRET authentication
//   - Never fakes success — only returns 200 if the DM was actually delivered
//
// Persistence:
//   - Creates an Intervention record with PENDING status
//   - Updates to SENT or FAILED based on actual delivery result

const log = logger.child({ module: "api/notification/send" });

const BodySchema = z.object({
  teamId: z.string().min(1),
  threadId: z.string().min(1),
  platformUserId: z.string().min(1),
  platform: z.enum(["DISCORD", "SLACK", "TEAMS", "WHATSAPP", "TELEGRAM", "GOOGLE_CHAT"]),
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session user ID missing" }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { teamId, threadId, platformUserId, platform, message } = parsed.data;

  // ── RBAC check ────────────────────────────────────────────────────────────
  const authorized = await hasTeamAccess(userId, teamId);
  if (!authorized) {
    log.warn({ userId, teamId }, "RBAC denied: cannot send nudge for this team");
    return NextResponse.json(
      { error: "Forbidden — insufficient role for this team" },
      { status: 403 }
    );
  }

  // ── Verify thread belongs to this team ───────────────────────────────────
  const thread = await prisma.conversationThread.findFirst({
    where: { id: threadId, teamId },
    select: { id: true },
  });

  if (!thread) {
    return NextResponse.json(
      { error: "Thread not found in this team" },
      { status: 404 }
    );
  }

  // ── Find the member record (optional) ─────────────────────────────────────
  const member = await prisma.member.findFirst({
    where: { teamId, platformUserId },
    select: { id: true },
  });

  // ── Create Intervention record (PENDING) ─────────────────────────────────
  let intervention = await prisma.intervention.create({
    data: {
      teamId,
      threadId,
      memberId: member?.id ?? null,
      platformUserId,
      platform,
      message,
      status: "PENDING",
    },
  });

  // ── Deliver the DM via bot's notify server ────────────────────────────────
  if (platform !== "DISCORD") {
    // Only Discord DMs are implemented. Future: Slack, Teams, etc.
    await prisma.intervention.update({
      where: { id: intervention.id },
      data: {
        status: "FAILED",
        errorMessage: `Platform ${platform} is not yet supported for DM delivery`,
      },
    });
    return NextResponse.json(
      { error: `Platform ${platform} is not yet supported` },
      { status: 400 }
    );
  }

  const NOTIFY_SECRET = process.env.NOTIFY_SECRET;
  const NOTIFY_PORT = process.env.NOTIFY_PORT ?? "3001";
  const notifyUrl = `http://localhost:${NOTIFY_PORT}/notify`;

  if (!NOTIFY_SECRET) {
    log.error("NOTIFY_SECRET not configured — cannot deliver DM");
    await prisma.intervention.update({
      where: { id: intervention.id },
      data: {
        status: "FAILED",
        errorMessage: "Service misconfigured: NOTIFY_SECRET not set",
      },
    });
    return NextResponse.json(
      { error: "Service misconfigured — DM delivery is disabled" },
      { status: 503 }
    );
  }

  try {
    const notifyRes = await fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NOTIFY_SECRET}`,
      },
      body: JSON.stringify({ userId: platformUserId, message }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    const notifyData = (await notifyRes.json()) as { ok: boolean; error?: string };

    if (notifyRes.ok && notifyData.ok) {
      // DM was actually delivered
      intervention = await prisma.intervention.update({
        where: { id: intervention.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      log.info({ interventionId: intervention.id, platformUserId }, "DM delivered successfully");

      return NextResponse.json({
        status: "sent",
        interventionId: intervention.id,
        deliveredAt: intervention.sentAt,
      });
    } else {
      // Bot returned an error (e.g., user has DMs disabled)
      const errorMsg = notifyData.error ?? `Bot returned ${notifyRes.status}`;
      intervention = await prisma.intervention.update({
        where: { id: intervention.id },
        data: {
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });

      log.warn(
        { interventionId: intervention.id, platformUserId, error: errorMsg },
        "DM delivery failed"
      );

      return NextResponse.json(
        {
          error: "DM delivery failed",
          reason: errorMsg,
          interventionId: intervention.id,
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await prisma.intervention.update({
      where: { id: intervention.id },
      data: {
        status: "FAILED",
        errorMessage: `Network error: ${errorMsg}`,
      },
    });

    log.error({ err: errorMsg, interventionId: intervention.id }, "DM delivery network error");

    return NextResponse.json(
      { error: "Failed to reach DM delivery service", interventionId: intervention.id },
      { status: 502 }
    );
  }
}
