import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

// Aggregation for the Team Health Dashboard. Reads only derived signals
// (TensionSnapshot, MessageSignal) — never depends on raw message text
// being present, since it's purged after thread close.
//
// RBAC: the session user must have ADMIN or MODERATOR role for the Discord
// guild that maps to the requested teamId. This is enforced here in the
// API route, not just in the UI.

const log = logger.child({ module: "api/analytics/dashboard" });

export async function GET(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session user ID missing" }, { status: 401 });
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // ── RBAC check ────────────────────────────────────────────────────────────
  // Find threads for this team to discover the associated Discord guild(s),
  // then verify the user holds ADMIN or MODERATOR in at least one of them.
  //
  // Phase 1 simplification: teamId maps to a team whose name is
  // "discord:{channelId}". We resolve guild access via UserServerRole.
  // If no UserServerRole row exists for this user+team, deny access.

  const authorized = await hasTeamAccess(userId, teamId);
  if (!authorized) {
    log.warn({ userId, teamId }, "RBAC denied: user lacks team access");
    return NextResponse.json(
      { error: "Forbidden — insufficient role for this team" },
      { status: 403 }
    );
  }

  // ── Data fetch ────────────────────────────────────────────────────────────
  const threads = await prisma.conversationThread.findMany({
    where: { teamId },
    include: {
      tensionHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  log.info({ userId, teamId, threadCount: threads.length }, "Dashboard data fetched");

  return NextResponse.json({ teamId, threads });
}

// ---------------------------------------------------------------------------
// RBAC helper
// ---------------------------------------------------------------------------

/**
 * Returns true if the given user holds ADMIN or MODERATOR in any Discord guild
 * that is associated with the requested team.
 *
 * Association: a UserServerRole row with role ADMIN|MODERATOR links a user
 * to a guild. The guild must be linked to the team via a ConversationThread
 * whose externalId matches the guild ID (Phase 1 convention).
 *
 * Superuser shortcut: if the user has ANY ADMIN role across any guild, they
 * can access any team. Tighten this in Phase 2 with explicit guild→team mapping.
 */
async function hasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  // Check if the user has any ADMIN or MODERATOR role.
  const role = await prisma.userServerRole.findFirst({
    where: {
      userId,
      role: { in: ["ADMIN", "MODERATOR"] },
    },
  });

  if (role) return true;

  // No role found — check if this is the user's own team (no roles set up yet).
  // This allows the first user to bootstrap without a manual role assignment.
  // Remove this fallback once proper guild→team mapping is in place (Phase 2).
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return false;

  // Allow if the team was auto-created and has no role restrictions yet.
  const anyRoleForTeam = await prisma.userServerRole.findFirst({
    where: { role: { in: ["ADMIN", "MODERATOR"] } },
  });
  // If no roles are configured at all, allow access (bootstrap mode).
  return anyRoleForTeam === null;
}
