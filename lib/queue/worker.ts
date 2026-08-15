/**
 * lib/queue/worker.ts — BullMQ Worker for the Discord ingestion queue.
 *
 * ⚠️  DEPLOYMENT NOTE (no-Docker/single-app constraint):
 * BullMQ workers are persistent processes that must remain alive to poll Redis.
 * They CANNOT run as Vercel serverless functions (which terminate after the
 * response). This worker is therefore started from bot/index.ts — it runs
 * inside the same long-lived Node process as the Discord bot. No separate
 * container or microservice is needed.
 *
 * Sequential per-thread ordering:
 * BullMQ does not natively support per-key ordering. We achieve sequential
 * per-thread processing by setting concurrency=1 on the worker (only one job
 * processed at a time globally). For a future multi-process setup, upgrade to
 * BullMQ Pro's group concurrency or wrap the job with a per-threadId Redis
 * lock (redlock).
 *
 * Pipeline:
 *   1. Upsert Member + ConversationThread in Postgres
 *   2. Store Message (raw text)
 *   3. Run AI analysis (NLP → prediction → mediation) via analyzeThread()
 *   4. Write MessageSignal + TensionSnapshot
 *   5. Publish dashboard update via Redis pub/sub
 */

import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db/client";
import { analyzeThread } from "@/lib/ai/client";
import { publishDashboardUpdate } from "@/lib/realtime/redis";
import { logger } from "@/lib/logger";
import type { DiscordIngestionJobData } from "./index";
import { redisConnection } from "./index";

const log = logger.child({ module: "ingestion-worker" });

// ---------------------------------------------------------------------------
// Pipeline helpers
// ---------------------------------------------------------------------------

async function upsertMemberAndThread(
  normalized: DiscordIngestionJobData["normalized"]
) {
  // Find or create a Team keyed on the external thread/channel ID.
  // In Phase 1 each Discord channel maps 1-to-1 with a Team for simplicity.
  // Phase 2 will introduce explicit guild→team mapping.
  let team = await prisma.team.findFirst({
    where: { name: `discord:${normalized.externalThreadId}` },
  });
  if (!team) {
    team = await prisma.team.create({
      data: { name: `discord:${normalized.externalThreadId}` },
    });
  }

  // Upsert ConversationThread
  let thread = await prisma.conversationThread.findFirst({
    where: {
      teamId: team.id,
      platform: normalized.platform,
      externalId: normalized.externalThreadId,
    },
  });
  if (!thread) {
    thread = await prisma.conversationThread.create({
      data: {
        teamId: team.id,
        platform: normalized.platform,
        externalId: normalized.externalThreadId,
        status: "ACTIVE",
      },
    });
  }

  // Upsert Member
  let member = await prisma.member.findFirst({
    where: { teamId: team.id, platformUserId: normalized.platformUserId },
  });
  if (!member) {
    member = await prisma.member.create({
      data: {
        teamId: team.id,
        displayName: normalized.displayName,
        platformUserId: normalized.platformUserId,
        platform: normalized.platform,
      },
    });
  }

  return { team, thread, member };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export function createIngestionWorker() {
  const worker = new Worker<DiscordIngestionJobData>(
    "ingestion-discord",
    async (job: Job<DiscordIngestionJobData>) => {
      const { normalized, enqueuedAt } = job.data;
      const queueLatencyMs = Date.now() - enqueuedAt;

      const jobLog = log.child({
        jobId: job.id,
        threadId: normalized.externalThreadId,
        platform: normalized.platform,
        queueLatencyMs,
      });

      jobLog.info("Processing ingestion job");

      // ── 1. DB: upsert member + thread ────────────────────────────────────
      const { thread, member } = await upsertMemberAndThread(normalized);

      // ── 2. DB: store raw message ──────────────────────────────────────────
      const message = await prisma.message.create({
        data: {
          threadId: thread.id,
          memberId: member.id,
          rawText: normalized.text,
          sentAt: new Date(normalized.sentAt),
        },
      });

      // ── 3. Build signals summary (no raw text — only derived metadata) ────
      // Fetch recent thread signals for context.
      const recentSignals = await prisma.messageSignal.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { message: { select: { member: { select: { displayName: true } } } } },
      });

      const lastSnapshot = await prisma.tensionSnapshot.findFirst({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
      });

      // Build a derived-signals summary. Only display names (no raw text) to
      // comply with the PII constraint.
      const signalsSummary = recentSignals
        .map(
          (s) =>
            `user=${s.message.member.displayName} sentiment=${s.sentiment.toFixed(2)} emotion=${s.emotion} interruption=${s.interruption}`
        )
        .join("; ");

      const contextSummary = `Thread has ${recentSignals.length} recent messages. ` +
        `Latest sentiment trend: ${signalsSummary || "no prior signals"}. ` +
        `Current sender: ${normalized.displayName}.`;

      // ── 4. AI pipeline ────────────────────────────────────────────────────
      const analysis = await analyzeThread({
        messageText: normalized.text,
        signalsSummary: signalsSummary || "no prior signals",
        contextSummary,
        previousTensionScore: lastSnapshot?.tensionScore ?? 0,
      });

      jobLog.info(
        {
          tensionScore: analysis.tensionScore,
          escalationLevel: analysis.escalationLevel,
          isFallback: analysis.isFallback,
        },
        "AI analysis complete"
      );

      // ── 5. DB: write MessageSignal ────────────────────────────────────────
      await prisma.messageSignal.create({
        data: {
          messageId: message.id,
          threadId: thread.id,
          embedding: [], // placeholder — real embeddings via Voyage AI in Phase 2
          sentiment: analysis.sentiment,
          emotion: "unknown", // NlpAnalysis emotion not exposed at this layer yet
          interruption: false,
        },
      });

      // ── 6. DB: write TensionSnapshot ──────────────────────────────────────
      const tensionScore01 = analysis.tensionScore / 100;
      const trend = tensionScore01 - (lastSnapshot?.tensionScore ?? 0);

      const snapshot = await prisma.tensionSnapshot.create({
        data: {
          threadId: thread.id,
          tensionScore: tensionScore01,
          trend,
          confidence: analysis.confidence,
          signalsFired: analysis.signalsFired,
        },
      });

      // ── 7. Publish dashboard update via Redis pub/sub ─────────────────────
      await publishDashboardUpdate({
        type: "TENSION_UPDATE",
        threadId: thread.id,
        snapshot: {
          id: snapshot.id,
          tensionScore: tensionScore01,
          escalationLevel: analysis.escalationLevel,
          trend,
          signalsFired: analysis.signalsFired,
          createdAt: snapshot.createdAt.toISOString(),
        },
        mediationSuggestion: analysis.isFallback
          ? null
          : analysis.mediationSuggestion,
      });

      jobLog.info({ snapshotId: snapshot.id }, "Ingestion job complete");
    },
    {
      connection: redisConnection,
      // concurrency=1 ensures messages are processed one at a time,
      // preserving conversational context ordering within this worker process.
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    log.error(
      { jobId: job?.id, err: err.message },
      "Ingestion job failed"
    );
  });

  worker.on("error", (err) => {
    log.error({ err: err.message }, "Worker error");
  });

  log.info("Discord ingestion worker started (concurrency=1)");
  return worker;
}
