import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { hasTeamAccess } from "@/lib/auth/rbac";
import { redis, DASHBOARD_CHANNEL } from "@/lib/realtime/redis";
import { logger } from "@/lib/logger";

/**
 * GET /api/realtime/stream?teamId=<id>
 *
 * Server-Sent Events (SSE) endpoint for live dashboard updates.
 *
 * Architecture:
 *   Worker → Redis pub/sub → this endpoint subscribes → browser EventSource
 *
 * Security:
 *   - Requires authenticated session
 *   - Requires ADMIN or MODERATOR role for the requested team
 *   - Events are filtered: only events for the requested teamId are sent
 *   - Redis is NEVER exposed directly to the browser
 *
 * Note: SSE is used instead of Socket.IO for Vercel/Edge compatibility.
 * Socket.IO is already a dependency and can be used for full bidirectional
 * communication in future iterations.
 */

const log = logger.child({ module: "api/realtime/stream" });

export async function GET(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Session user ID missing" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return new Response(JSON.stringify({ error: "teamId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── RBAC check ────────────────────────────────────────────────────────────
  const authorized = await hasTeamAccess(userId, teamId);
  if (!authorized) {
    log.warn({ userId, teamId }, "SSE: RBAC denied");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  log.info({ userId, teamId }, "SSE stream connected");

  // ── Create SSE response with Redis subscription ───────────────────────────
  // Create a dedicated Redis subscriber connection (not the shared one)
  const subscriber = redis.duplicate();

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection confirmation
      const connectEvent =
        `event: connected\ndata: ${JSON.stringify({ teamId, ts: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Subscribe to the dashboard updates channel
      // ioredis subscribe() does not take a message callback directly.
      // Use the 'message' event on the subscriber instance instead.
      await subscriber.subscribe(DASHBOARD_CHANNEL);

      subscriber.on("message", (channel: string, rawMessage: string) => {
        if (isClosed) return;
        if (channel !== DASHBOARD_CHANNEL) return;

        try {
          const payload = JSON.parse(rawMessage) as { teamId?: string; type?: string };

          // Only forward events for THIS team — tenant isolation
          if (payload.teamId !== teamId) return;

          const sseEvent = `event: update\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(sseEvent));
        } catch {
          // Malformed pub/sub message — ignore
        }
      });

      // Heartbeat every 25 seconds to keep the connection alive through proxies
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 25_000);

      // Cleanup on stream close
      req.signal.addEventListener("abort", async () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        await subscriber.unsubscribe(DASHBOARD_CHANNEL);
        await subscriber.quit();
        log.info({ userId, teamId }, "SSE stream disconnected");
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
