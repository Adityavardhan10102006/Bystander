import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Aggregation for the Team Health Dashboard. Reads only derived signals
// (TensionSnapshot, MessageSignal) — never depends on raw message text
// being present, since it's purged after thread close.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const threads = await prisma.conversationThread.findMany({
    where: { teamId },
    include: {
      tensionHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({ teamId, threads });
}
