import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { hasTeamAccess } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

// Aggregation for the Team Health Dashboard. Reads only derived signals
// (TensionSnapshot, MessageSignal) — never depends on raw message text
// being present, since it's purged after thread close.
//
// RBAC: the session user must have ADMIN or MODERATOR role for the specific
// Discord guild that owns the requested team. Enforced via lib/auth/rbac.ts.
// A role in a different guild does NOT grant access.

const log = logger.child({ module: "api/analytics/dashboard" });

const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";

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

  // ── Demo mode ─────────────────────────────────────────────────────────────
  if (DEMO_MODE) {
    const { getDemoDashboard } = await import("@/lib/demo/data");
    const teamId = new URL(req.url).searchParams.get("teamId") ?? "demo-team";
    return NextResponse.json({ ...getDemoDashboard(teamId), isDemoMode: true });
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  // ── Tenant-aware RBAC check ───────────────────────────────────────────────
  // Uses the team's discordGuildId to verify the user's role for THIS specific
  // guild. A role in any other guild is NOT sufficient.
  const authorized = await hasTeamAccess(userId, teamId);
  if (!authorized) {
    log.warn({ userId, teamId }, "RBAC denied: user lacks access to this team");
    return NextResponse.json(
      { error: "Forbidden — insufficient role for this team" },
      { status: 403 }
    );
  }

  // ── Data fetch ────────────────────────────────────────────────────────────
  const [threads, interventionCounts] = await Promise.all([
    prisma.conversationThread.findMany({
      where: { teamId },
      include: {
        tensionHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.intervention.groupBy({
      by: ["threadId", "status"],
      where: { teamId },
      _count: true,
    }),
  ]);

  // Attach intervention count summary to threads
  const interventionsByThread: Record<string, { sent: number; failed: number }> = {};
  for (const row of interventionCounts) {
    if (!interventionsByThread[row.threadId]) {
      interventionsByThread[row.threadId] = { sent: 0, failed: 0 };
    }
    if (row.status === "SENT") interventionsByThread[row.threadId].sent += row._count;
    if (row.status === "FAILED") interventionsByThread[row.threadId].failed += row._count;
  }

  const threadsWithInterventions = threads.map((t) => ({
    ...t,
    interventions: interventionsByThread[t.id] ?? { sent: 0, failed: 0 },
  }));

  log.info({ userId, teamId, threadCount: threads.length }, "Dashboard data fetched");

  return NextResponse.json({ teamId, threads: threadsWithInterventions, isDemoMode: false });
}
