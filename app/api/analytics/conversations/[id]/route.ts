import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

// Read-only endpoint to fetch a single conversation's details for the UI.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
  }

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

  // Next.js App Router API route format
  return NextResponse.json(thread);
}
