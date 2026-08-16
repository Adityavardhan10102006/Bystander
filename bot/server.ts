/**
 * server.ts — Internal HTTP endpoint for DM delivery.
 *
 * Exposes a tiny HTTP server on NOTIFY_PORT (default 3001) so the Next.js
 * app (or any internal service) can trigger a Discord DM without needing a
 * shared in-process import.
 *
 * POST /notify
 *   Body: { "userId": "<discord snowflake>", "message": "<text>" }
 *   Response 200: { "ok": true }
 *   Response 4xx/5xx: { "ok": false, "error": "<reason>" }
 *
 * Security: REQUIRES Authorization: Bearer <NOTIFY_SECRET>.
 * This endpoint is internal only — never expose it publicly.
 * Security FAILS CLOSED: if NOTIFY_SECRET is not set, ALL requests are
 * rejected (the server must be properly configured before use).
 */

import "dotenv/config";
import http from "http";
import { Client } from "discord.js";
import { sendDM } from "./notify";

// ---------------------------------------------------------------------------
// Request body schema (zero-dep runtime validation)
// ---------------------------------------------------------------------------

interface NotifyBody {
  userId: string;
  message: string;
}

function isNotifyBody(v: unknown): v is NotifyBody {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.userId === "string" && typeof obj.message === "string";
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

const NOTIFY_PORT = Number(process.env.NOTIFY_PORT ?? 3001);

/**
 * SECURITY: NOTIFY_SECRET is REQUIRED.
 * If not set, the server starts but rejects ALL requests with 503.
 * This ensures security fails CLOSED — never silently allows unauthenticated
 * DM delivery.
 */
const NOTIFY_SECRET = process.env.NOTIFY_SECRET;

if (!NOTIFY_SECRET) {
  console.error(
    "[server] NOTIFY_SECRET is not set. The notify server will reject all requests.\n" +
    "         Generate one with: openssl rand -base64 32\n" +
    "         Set NOTIFY_SECRET in .env for both the bot and the Next.js app."
  );
}

/**
 * Starts the internal HTTP server and binds it to NOTIFY_PORT.
 * Returns the http.Server instance so callers can close it in tests.
 */
export function startNotifyServer(client: Client): http.Server {
  const server = http.createServer(async (req, res) => {
    // Only handle POST /notify
    if (req.method !== "POST" || req.url !== "/notify") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }

    // SECURITY: Require NOTIFY_SECRET — fail CLOSED.
    if (!NOTIFY_SECRET) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Service misconfigured — NOTIFY_SECRET is not set" }));
      return;
    }

    const auth = req.headers["authorization"] ?? "";
    if (auth !== `Bearer ${NOTIFY_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }

    // Read + size-limit the request body
    let rawBody = "";
    try {
      for await (const chunk of req) {
        rawBody += chunk;
        if (rawBody.length > 4096) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Payload too large" }));
          return;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: `Read error: ${msg}` }));
      return;
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
      return;
    }

    if (!isNotifyBody(body)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Body must be { "userId": string, "message": string }',
        })
      );
      return;
    }

    const result = await sendDM(client, body.userId, body.message);

    if (result.ok) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: result.error }));
    }
  });

  server.listen(NOTIFY_PORT, () => {
    console.log(`[server] Notify HTTP server listening on port ${NOTIFY_PORT}`);
    if (!NOTIFY_SECRET) {
      console.warn("[server] ⚠️  NOTIFY_SECRET not set — all requests will be rejected");
    }
  });

  server.on("error", (err) => {
    console.error("[server] HTTP server error:", err.message);
  });

  return server;
}
