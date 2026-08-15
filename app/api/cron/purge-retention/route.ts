import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

// Retention purge job — sets Message.rawText to NULL for messages in threads
// with status CLOSED or ARCHIVED.
//
// Trigger: Vercel Cron (configured in vercel.json) on a schedule set by
// RETENTION_PURGE_INTERVAL_HOURS (default 24 h).
//
// Security: protected by CRON_SECRET Bearer token in the Authorization header.
// Vercel Cron automatically sends this header when configured.
//
// Returns a JSON summary of what was purged (for observability).

const log = logger.child({ module: "api/cron/purge-retention" });

export async function GET(req: NextRequest) {
  // ── Auth: require CRON_SECRET ─────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      log.warn("Purge cron called with invalid or missing CRON_SECRET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  log.info("Retention purge job started");

  // ── Find threads eligible for purge ───────────────────────────────────────
  // Eligible = status is CLOSED or ARCHIVED, not yet purged.
  const eligibleThreads = await prisma.conversationThread.findMany({
    where: {
      status: { in: ["CLOSED", "ARCHIVED"] },
      purgedAt: null,
    },
    select: { id: true, status: true, externalId: true },
  });

  if (eligibleThreads.length === 0) {
    log.info("No threads eligible for purge");
    return NextResponse.json({
      purgedThreads: 0,
      purgedMessages: 0,
      durationMs: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  }

  const threadIds = eligibleThreads.map((t) => t.id);
  log.info({ count: threadIds.length }, "Threads eligible for purge");

  // ── Purge raw text in batches ─────────────────────────────────────────────
  // Use updateMany for efficiency — one query per batch rather than N queries.
  const BATCH_SIZE = 500;
  let totalPurged = 0;

  for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BATCH_SIZE);

    const result = await prisma.message.updateMany({
      where: {
        threadId: { in: batch },
        rawText: { not: null }, // Only update rows that still have text
      },
      data: { rawText: null },
    });

    totalPurged += result.count;
    log.debug({ batch: Math.floor(i / BATCH_SIZE) + 1, purged: result.count }, "Batch purged");
  }

  // ── Mark threads as purged ────────────────────────────────────────────────
  await prisma.conversationThread.updateMany({
    where: { id: { in: threadIds } },
    data: { purgedAt: new Date() },
  });

  const durationMs = Date.now() - startedAt;

  log.info(
    { purgedThreads: eligibleThreads.length, purgedMessages: totalPurged, durationMs },
    "Retention purge job complete"
  );

  return NextResponse.json({
    purgedThreads: eligibleThreads.length,
    purgedMessages: totalPurged,
    durationMs,
    ts: new Date().toISOString(),
  });
}
