// tests/ingestion.test.ts — Unit and contract tests for ingestion endpoint logic & validation
// Run: npx vitest run tests/ingestion.test.ts

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema replicating the ingestion route validation
const DiscordPayloadSchema = z.object({
  channel_id: z.string().min(1),
  guild_id: z.string().min(1).optional(),
  author: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
  }),
  content: z.string(),
  timestamp: z.string(),
  message_id: z.string().optional(),
});

describe("Ingestion Payload Validation", () => {
  it("accepts a valid discord payload with guild_id and message_id", () => {
    const payload = {
      channel_id: "channel-123",
      guild_id: "guild-456",
      author: {
        id: "user-789",
        username: "johndoe",
      },
      content: "Hello team, let's discuss the project roadmap.",
      timestamp: new Date().toISOString(),
      message_id: "msg-001",
    };

    const result = DiscordPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts a payload without optional guild_id (e.g. DM channel)", () => {
    const payload = {
      channel_id: "dm-channel-123",
      author: {
        id: "user-789",
        username: "johndoe",
      },
      content: "Direct message content",
      timestamp: new Date().toISOString(),
    };

    const result = DiscordPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects payload missing author or author fields", () => {
    const invalidPayload1 = {
      channel_id: "channel-123",
      content: "Hello",
      timestamp: new Date().toISOString(),
    };

    const invalidPayload2 = {
      channel_id: "channel-123",
      author: { id: "" },
      content: "Hello",
      timestamp: new Date().toISOString(),
    };

    expect(DiscordPayloadSchema.safeParse(invalidPayload1).success).toBe(false);
    expect(DiscordPayloadSchema.safeParse(invalidPayload2).success).toBe(false);
  });

  it("rejects payload missing channel_id", () => {
    const payload = {
      channel_id: "",
      author: { id: "user-1", username: "alice" },
      content: "Hello",
      timestamp: new Date().toISOString(),
    };
    expect(DiscordPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

describe("Ingestion Secret Authentication Logic", () => {
  function verifyIngestionAuth(authHeader: string | null, secret: string | undefined): { status: number; error?: string } {
    if (!secret) {
      return { status: 503, error: "Service misconfigured — ingestion is disabled" };
    }
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return { status: 401, error: "Unauthorized" };
    }
    return { status: 200 };
  }

  it("fails closed (503) when INGESTION_SECRET is missing or empty", () => {
    expect(verifyIngestionAuth("Bearer valid-secret", undefined).status).toBe(503);
    expect(verifyIngestionAuth("Bearer valid-secret", "").status).toBe(503);
  });

  it("returns 401 when Authorization header is missing or mismatch", () => {
    const secret = "test-secret-1234567890";
    expect(verifyIngestionAuth(null, secret).status).toBe(401);
    expect(verifyIngestionAuth("Bearer wrong-secret", secret).status).toBe(401);
    expect(verifyIngestionAuth("Basic abcdef", secret).status).toBe(401);
  });

  it("returns 200 when Authorization header matches Bearer secret", () => {
    const secret = "test-secret-1234567890";
    expect(verifyIngestionAuth(`Bearer ${secret}`, secret).status).toBe(200);
  });
});
