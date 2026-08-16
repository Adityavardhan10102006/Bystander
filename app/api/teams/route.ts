import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { getUserTeams } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

/**
 * GET /api/teams
 *
 * Returns the list of teams the authenticated user can access
 * (ADMIN or MODERATOR role in the associated Discord guild).
 *
 * Response:
 *   200: { teams: [{ id, name, platform, discordGuildId, createdAt }] }
 *   401: Unauthorized
 */

const log = logger.child({ module: "api/teams" });

export async function GET(req: NextRequest) {
  // Suppress unused warning — req is required by Next.js route signature
  void req;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session user ID missing" }, { status: 401 });
  }

  try {
    const teams = await getUserTeams(userId);
    log.info({ userId, teamCount: teams.length }, "Teams listed");
    return NextResponse.json({ teams });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message, userId }, "Failed to list teams");
    return NextResponse.json({ error: "Failed to retrieve teams" }, { status: 500 });
  }
}
