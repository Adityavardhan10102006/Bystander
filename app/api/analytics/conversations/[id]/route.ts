import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { hasTeamAccess } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

// Read-only endpoint to fetch a single conversation's details for the UI.
//
// RBAC: the session user must have ADMIN or MODERATOR role for the specific
// guild that owns this thread's team. Verified via lib/auth/rbac.ts.
//
// Privacy: rawText is only included in the response for ADMIN/MODERATOR users
// of the correct team. MEMBER role cannot see raw message content.

const log = logger.child({ module: "api/analytics/conversations/[id]" });

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session user ID missing" }, { status: 401 });
  }

  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
  }

  // Fetch the thread metadata first to get teamId for RBAC check.
  const thread = await prisma.conversationThread.findUnique({
    where: { id },
    include: {
      team: {
        include: { members: true },
      },
      messages: {
        include: {
          // Include signal but NOT rawText — we'll strip it if not authorized
          signal: true,
          member: {
            select: {
              displayName: true,
              platformUserId: true,
            },
          },
        },
        orderBy: { sentAt: "asc" },
      },
      signals: true,
      tensionHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // ── Tenant-aware RBAC check ───────────────────────────────────────────────
  const authorized = await hasTeamAccess(userId, thread.teamId);
  if (!authorized) {
    log.warn({ userId, threadId: id, teamId: thread.teamId }, "RBAC denied");
    return NextResponse.json(
      { error: "Forbidden — insufficient role for this conversation" },
      { status: 403 }
    );
  }

  // ── Fetch interventions for this thread ───────────────────────────────────
  const interventions = await prisma.intervention.findMany({
    where: { threadId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      platformUserId: true,
      message: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      sentAt: true,
    },
  });

  // ── Privacy: rawText is available to ADMIN/MODERATOR of the correct team ──
  // hasTeamAccess already confirmed ADMIN or MODERATOR, so rawText is safe here.
  // If we add MEMBER role viewing in the future, strip rawText for them.

  log.info({ userId, threadId: id }, "Conversation detail fetched");

  return NextResponse.json({ ...thread, interventions });
}
