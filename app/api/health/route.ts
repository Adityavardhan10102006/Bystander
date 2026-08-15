import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { circuitBreaker } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

// Plain GET /api/health — no auth required.
// Returns basic service liveness status so ops tooling and load-balancers
// can detect unhealthy instances. Implements the "container health check"
// requirement as a plain HTTP route (no-Docker constraint).

const log = logger.child({ module: "api/health" });

export async function GET() {
  const checks: Record<string, string | object> = {};

  // ── Database ──────────────────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn({ err: message }, "Health check: database unreachable");
    checks.database = "error";
  }

  // ── Redis ─────────────────────────────────────────────────────────────────
  try {
    // Import lazily to avoid pulling Redis into every edge function.
    const { redis } = await import("@/lib/realtime/redis");
    await redis.ping();
    checks.redis = "ok";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn({ err: message }, "Health check: Redis unreachable");
    checks.redis = "error";
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? "configured" : "missing";
  checks.anthropicCircuitBreaker = circuitBreaker.stats();

  // ── Overall status ────────────────────────────────────────────────────────
  const degraded =
    checks.database === "error" ||
    checks.redis === "error" ||
    checks.anthropic === "missing";

  const status = degraded ? "degraded" : "ok";
  const httpStatus = degraded ? 503 : 200;

  return NextResponse.json(
    {
      status,
      checks,
      ts: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    },
    { status: httpStatus }
  );
}
