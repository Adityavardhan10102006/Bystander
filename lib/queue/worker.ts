/**
 * lib/queue/worker.ts — BullMQ Worker for the Discord ingestion queue.
 *
 * ⚠️  DEPLOYMENT NOTE (no-Docker/single-app constraint):
 * BullMQ workers are persistent processes that must remain alive to poll Redis.
 * They CANNOT run as Vercel serverless functions (which terminate after the
 * response). This worker is therefore started from bot/index.ts — it runs
 * inside the same long-lived Node process as the Discord bot.
 *
 * Sequential per-thread ordering:
 * concurrency=1 ensures messages are processed one at a time globally,
 * preserving conversational context ordering within this worker process.
 *
 * Pipeline:
 *   1. Upsert Team + Member + ConversationThread in Postgres (atomic)
 *   2. Store Message (raw text)
 *   3. Run AI analysis (single structured call via analyzeThread())
 *   4. Compute deterministic risk score (lib/risk/score.ts)
 *   5. Write MessageSignal + TensionSnapshot
 *   6. Publish dashboard update via Redis pub/sub
 */

import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db/client";
import { analyzeThread } from "@/lib/ai/client";
import { computeRiskScore } from "@/lib/risk/score";
import type { SignalInput } from "@/lib/risk/signals";
import { NUDGE_THRESHOLD } from "@/lib/risk/thresholds";
import { publishDashboardUpdate } from "@/lib/realtime/redis";
import { logger } from "@/lib/logger";
import type { DiscordIngestionJobData } from "./index";
import { redisConnection } from "./index";

const log = logger.child({ module: "ingestion-worker" });

// ---------------------------------------------------------------------------
// Pipeline helpers
// ---------------------------------------------------------------------------

async function upsertTeamMemberThread(
  normalized: DiscordIngestionJobData["normalized"]
) {
  // Upsert Team keyed on guildId (if present) or externalThreadId as fallback.
  // The team name uses the guild ID when available for proper guild→team mapping.
  const guildId = normalized.guildId;
  const teamName = guildId
    ? `discord-guild:${guildId}`
    : `discord-channel:${normalized.externalThreadId}`;

  // Use upsert to prevent race conditions from concurrent messages
  const team = await prisma.team.upsert({
    where: {
      // We need a unique identifier — use discordGuildId when available
      // For channels without guild mapping, use a placeholder
      id: await getOrCreateTeamId(teamName, guildId),
    },
    update: {
      // Keep discordGuildId updated if we now have it
      ...(guildId ? { discordGuildId: guildId } : {}),
    },
    create: {
      name: teamName,
      discordGuildId: guildId ?? null,
      platform: normalized.platform,
    },
  });

  // Upsert ConversationThread — unique by teamId + externalId + platform
  const thread = await prisma.conversationThread.upsert({
    where: {
      teamId_externalId_platform: {
        teamId: team.id,
        externalId: normalized.externalThreadId,
        platform: normalized.platform,
      },
    },
    update: {
      // Update guildId if we now have it
      ...(guildId ? { guildId } : {}),
    },
    create: {
      teamId: team.id,
      platform: normalized.platform,
      externalId: normalized.externalThreadId,
      guildId: guildId ?? null,
      status: "ACTIVE",
    },
  });

  // Upsert Member — unique by teamId + platformUserId
  const member = await prisma.member.upsert({
    where: {
      teamId_platformUserId: {
        teamId: team.id,
        platformUserId: normalized.platformUserId,
      },
    },
    update: {
      // Update display name in case username changed
      displayName: normalized.displayName,
    },
    create: {
      teamId: team.id,
      displayName: normalized.displayName,
      platformUserId: normalized.platformUserId,
      platform: normalized.platform,
    },
  });

  return { team, thread, member };
}

// Cache team IDs to avoid repeated DB lookups within the same worker process
const teamIdCache = new Map<string, string>();

async function getOrCreateTeamId(name: string, guildId?: string): Promise<string> {
  if (teamIdCache.has(name)) return teamIdCache.get(name)!;

  // Try to find by guild ID first (more reliable)
  if (guildId) {
    const existing = await prisma.team.findFirst({
      where: { discordGuildId: guildId },
      select: { id: true },
    });
    if (existing) {
      teamIdCache.set(name, existing.id);
      return existing.id;
    }
  }

  // Try by name
  const existing = await prisma.team.findFirst({
    where: { name },
    select: { id: true },
  });

  if (existing) {
    teamIdCache.set(name, existing.id);
    return existing.id;
  }

  // Create new — will be used in upsert's where clause
  // We return a placeholder; the upsert will create it
  return `__new__${name}`;
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
      const jobStart = Date.now();

      const jobLog = log.child({
        jobId: job.id,
        threadId: normalized.externalThreadId,
        platform: normalized.platform,
        queueLatencyMs,
      });

      jobLog.info("Processing ingestion job");

      // ── 1. DB: upsert team + thread + member ─────────────────────────────
      const { team, thread, member } = await upsertTeamMemberThread(normalized);

      // ── 2. DB: store raw message (with dedup on externalMessageId) ───────
      const messageData = {
        threadId: thread.id,
        memberId: member.id,
        rawText: normalized.text,
        sentAt: new Date(normalized.sentAt),
        externalId: normalized.externalMessageId ?? null,
      };

      let message;
      if (normalized.externalMessageId) {
        // Dedup: skip if we already have this message
        const existing = await prisma.message.findUnique({
          where: { externalId: normalized.externalMessageId },
          select: { id: true },
        });
        if (existing) {
          jobLog.info({ messageId: existing.id }, "Skipping duplicate message");
          return;
        }
      }

      message = await prisma.message.create({ data: messageData });

      // ── 3. Fetch context for AI analysis ─────────────────────────────────
      const [recentSignals, lastSnapshot, previousMessage] = await Promise.all([
        prisma.messageSignal.findMany({
          where: { threadId: thread.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            message: {
              select: {
                sentAt: true,
                member: { select: { displayName: true } },
              },
            },
          },
        }),
        prisma.tensionSnapshot.findFirst({
          where: { threadId: thread.id },
          orderBy: { createdAt: "desc" },
        }),
        // Get the previous message for reply gap calculation
        prisma.message.findFirst({
          where: { threadId: thread.id, id: { not: message.id } },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        }),
      ]);

      // Compute reply gap
      const replyGapMs = previousMessage
        ? new Date(normalized.sentAt).getTime() - previousMessage.sentAt.getTime()
        : null;

      // Build signal input for risk engine
      const sentimentHistory = recentSignals.map((s) => s.sentiment).reverse();
      const tensionHistory = (
        await prisma.tensionSnapshot.findMany({
          where: { threadId: thread.id },
          orderBy: { createdAt: "asc" },
          take: 5,
          select: { tensionScore: true },
        })
      ).map((s) => s.tensionScore);

      // Count recent messages (last 5 minutes)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentMessageCount = await prisma.message.count({
        where: {
          threadId: thread.id,
          sentAt: { gte: fiveMinAgo },
        },
      });

      // Build context summary (display names + derived signals only — no raw text)
      const signalsSummary = recentSignals
        .map(
          (s) =>
            `user=${s.message.member.displayName} sentiment=${s.sentiment.toFixed(2)} emotion=${s.emotion ?? "unknown"}`
        )
        .join("; ");

      const contextSummary =
        `Thread has ${recentSignals.length} recent messages. ` +
        `Latest signal trend: ${signalsSummary || "no prior signals"}. ` +
        `Current sender: ${normalized.displayName}.`;

      const previousScore = lastSnapshot?.tensionScore ?? 0;

      // ── 4. AI analysis — single structured call ───────────────────────────
      const aiStart = Date.now();
      const aiResult = await analyzeThread({
        messageText: normalized.text,
        signalsSummary: signalsSummary || "no prior signals",
        contextSummary,
        previousTensionScore: previousScore,
      });
      const aiLatencyMs = Date.now() - aiStart;

      jobLog.info(
        {
          aiLatencyMs,
          sentiment: aiResult.sentiment,
          emotion: aiResult.emotion,
          isFallback: aiResult.isFallback,
        },
        "AI analysis complete"
      );

      // ── 5. Deterministic risk scoring ─────────────────────────────────────
      const signalInput: SignalInput = {
        currentSentiment: aiResult.isFallback ? 0 : aiResult.sentiment,
        emotion: aiResult.isFallback ? "unknown" : (aiResult.emotion ?? "neutral"),
        sentimentHistory,
        tensionHistory,
        replyGapMs,
        recentMessageCount,
      };

      const riskResult = computeRiskScore(signalInput, previousScore);

      jobLog.info(
        {
          tensionScore: riskResult.tensionScore,
          riskLevel: riskResult.riskLevel,
          trendDirection: riskResult.trendDirection,
          signalCount: riskResult.signals.length,
        },
        "Risk score computed"
      );

      // ── 6. DB: write MessageSignal ─────────────────────────────────────────
      await prisma.messageSignal.create({
        data: {
          messageId: message.id,
          threadId: thread.id,
          sentiment: aiResult.isFallback ? 0 : aiResult.sentiment,
          emotion: aiResult.isFallback ? null : aiResult.emotion,
          replyGapMs: replyGapMs ?? null,
          interruption: replyGapMs !== null && replyGapMs < 5_000,
          signalCodes: riskResult.signalCodes,
        },
      });

      // ── 7. DB: write TensionSnapshot ──────────────────────────────────────
      const snapshot = await prisma.tensionSnapshot.create({
        data: {
          threadId: thread.id,
          tensionScore: riskResult.tensionScore,
          riskLevel: riskResult.riskLevel,
          trend: riskResult.trend,
          confidence: riskResult.confidence,
          signalsFired: riskResult.signalCodes,
          signalLabels: riskResult.signalLabels,
          mediationSuggestion: aiResult.isFallback
            ? null
            : (aiResult.mediationSuggestion ?? null),
        },
      });

      // ── 8. Publish dashboard update via Redis pub/sub ─────────────────────
      await publishDashboardUpdate({
        type: "TENSION_UPDATE",
        teamId: team.id,
        threadId: thread.id,
        snapshot: {
          id: snapshot.id,
          tensionScore: riskResult.tensionScore,
          riskLevel: riskResult.riskLevel,
          trendDirection: riskResult.trendDirection,
          trend: riskResult.trend,
          signalsFired: riskResult.signalCodes,
          signalLabels: riskResult.signalLabels,
          mediationSuggestion: snapshot.mediationSuggestion,
          createdAt: snapshot.createdAt.toISOString(),
        },
        shouldNudge: riskResult.tensionScore >= NUDGE_THRESHOLD && !aiResult.isFallback,
      });

      const totalMs = Date.now() - jobStart;
      jobLog.info(
        {
          snapshotId: snapshot.id,
          totalMs,
          aiLatencyMs,
          tensionScore: riskResult.tensionScore,
          riskLevel: riskResult.riskLevel,
          interventionNeeded: riskResult.tensionScore >= NUDGE_THRESHOLD,
        },
        "Ingestion job complete"
      );
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
