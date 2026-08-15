import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

// Read-only endpoint to fetch a single conversation's details for the UI.
//
// RBAC: the session user must have ADMIN or MODERATOR role in at least
// one guild that grants access to teams. Verified against UserServerRole.

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

  // Fetch the thread so we know which team (and therefore guild) it belongs to.
  const thread = await prisma.conversationThread.findUnique({
    where: { id },
    include: {
      team: {
        include: { members: true },
      },
      messages: {
        include: { signal: true, member: true },
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

  // ── RBAC check ────────────────────────────────────────────────────────────
  const authorized = await hasTeamAccess(userId, thread.teamId);
  if (!authorized) {
    log.warn({ userId, threadId: id, teamId: thread.teamId }, "RBAC denied");
    return NextResponse.json(
      { error: "Forbidden — insufficient role for this conversation" },
      { status: 403 }
    );
  }

  log.info({ userId, threadId: id }, "Conversation detail fetched");

  return NextResponse.json(thread);
}

// ---------------------------------------------------------------------------
// RBAC helper (same logic as dashboard route)
// ---------------------------------------------------------------------------

async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const role = await prisma.userServerRole.findFirst({
    where: {
      userId,
      role: { in: ["ADMIN", "MODERATOR"] },
    },
  });

  if (role) return true;

  // Bootstrap fallback: allow if no roles are configured yet.
  const anyRole = await prisma.userServerRole.findFirst({
    where: { role: { in: ["ADMIN", "MODERATOR"] } },
  });
  
  // Confirm the team exists before granting bootstrap access.
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  return anyRole === null && team !== null;
}
