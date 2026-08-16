/**
 * lib/env.ts — Zod-validated environment variables.
 *
 * Import this module at the top of any file that needs an env var.
 * It validates ALL required vars at startup and throws a clear, human-readable
 * error so misconfigured deploys fail immediately rather than at runtime.
 *
 * Usage:
 *   import { env } from "@/lib/env";
 *   const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
 */

import { z } from "zod";

const EnvSchema = z.object({
  // ── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .min(1, "DATABASE_URL must not be empty"),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z
    .string({ required_error: "REDIS_URL is required" })
    .min(1, "REDIS_URL must not be empty"),

  // ── Anthropic AI ──────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z
    .string({ required_error: "ANTHROPIC_API_KEY is required" })
    .min(1, "ANTHROPIC_API_KEY must not be empty"),

  AI_MODEL: z.string().default("claude-sonnet-4-6"),

  // ── Discord ───────────────────────────────────────────────────────────────
  DISCORD_BOT_TOKEN: z
    .string({ required_error: "DISCORD_BOT_TOKEN is required" })
    .min(1, "DISCORD_BOT_TOKEN must not be empty"),

  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),

  // ── Ingestion security ────────────────────────────────────────────────────
  // REQUIRED: The Discord bot must send this as Authorization: Bearer <secret>.
  // Security MUST fail CLOSED — never skip authentication if this is missing.
  INGESTION_SECRET: z
    .string({ required_error: "INGESTION_SECRET is required — generate with: openssl rand -base64 32" })
    .min(16, "INGESTION_SECRET must be at least 16 characters"),

  // ── Notification server ───────────────────────────────────────────────────
  // REQUIRED: Protects the internal DM-delivery server.
  NOTIFY_SECRET: z
    .string({ required_error: "NOTIFY_SECRET is required — generate with: openssl rand -base64 32" })
    .min(16, "NOTIFY_SECRET must be at least 16 characters"),

  // ── NextAuth ──────────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z
    .string({ required_error: "NEXTAUTH_SECRET is required" })
    .min(1, "NEXTAUTH_SECRET must not be empty"),

  NEXTAUTH_URL: z.string().url().optional(),

  // ── OAuth providers ───────────────────────────────────────────────────────
  GITHUB_CLIENT_ID: z
    .string({ required_error: "GITHUB_CLIENT_ID is required" })
    .min(1, "GITHUB_CLIENT_ID must not be empty"),

  GITHUB_CLIENT_SECRET: z
    .string({ required_error: "GITHUB_CLIENT_SECRET is required" })
    .min(1, "GITHUB_CLIENT_SECRET must not be empty"),

  GOOGLE_CLIENT_ID: z
    .string({ required_error: "GOOGLE_CLIENT_ID is required" })
    .min(1, "GOOGLE_CLIENT_ID must not be empty"),

  GOOGLE_CLIENT_SECRET: z
    .string({ required_error: "GOOGLE_CLIENT_SECRET is required" })
    .min(1, "GOOGLE_CLIENT_SECRET must not be empty"),

  // ── Cron ──────────────────────────────────────────────────────────────────
  // REQUIRED: Security must FAIL CLOSED. Without this, the purge endpoint is
  // open to anyone. Generate with: openssl rand -base64 32
  CRON_SECRET: z
    .string({ required_error: "CRON_SECRET is required — generate with: openssl rand -base64 32" })
    .min(16, "CRON_SECRET must be at least 16 characters"),

  // ── Retention ─────────────────────────────────────────────────────────────
  RETENTION_PURGE_INTERVAL_HOURS: z
    .string()
    .transform(Number)
    .refine((n) => n > 0, "RETENTION_PURGE_INTERVAL_HOURS must be a positive number")
    .default("24"),

  // ── Demo mode ─────────────────────────────────────────────────────────────
  // When true, the dashboard returns a deterministic demo dataset instead of
  // real DB queries. Clearly marked in API responses. NEVER use in production.
  DEMO_MODE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("false"),

  // ── Misc ──────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // ── Bot notify server ─────────────────────────────────────────────────────
  NOTIFY_PORT: z.string().transform(Number).default("3001"),
  BYSTANDER_API_URL: z.string().url().optional(),
});

// Parse once at module load. Any missing required var throws here.
function parseEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n[Bystander] Environment validation failed — fix the following before starting:\n${issues}\n`
    );
  }
  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof EnvSchema>;
