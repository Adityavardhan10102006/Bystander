import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { EscalationLevelLabel } from "@/types/pipeline";
import { logger } from "@/lib/logger";

// Single hosted provider for NLP analysis and mediation generation.
// One structured AI call per message — not three separate calls.
//
// The LLM provides: sentiment, emotion, explanation, mediation suggestion.
// The risk engine (lib/risk/) computes: tensionScore, riskLevel, signals, trend.
// The LLM NEVER controls the final numerical conflict score.

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

const log = logger.child({ module: "ai-client" });

// ---------------------------------------------------------------------------
// Validated AI response schema (Zod)
// The LLM must return this exact structure. We validate strictly.
// ---------------------------------------------------------------------------

const AiResponseSchema = z.object({
  sentiment: z
    .number()
    .min(-1)
    .max(1)
    .describe("Sentiment score: -1 (very negative) to 1 (very positive)"),
  emotion: z
    .string()
    .min(1)
    .describe("Primary emotion label (e.g. 'anger', 'frustration', 'neutral', 'joy')"),

  explanation: z
    .string()
    .describe("One sentence explaining the emotional state of this message"),
  mediationSuggestion: z
    .string()
    .optional()
    .describe("Brief, private, non-judgmental nudge for de-escalation. Only when sentiment < -0.3."),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------
// Handles Anthropic rate-limit (429) and overload (529) errors.
// maxAttempts=3, delays: 1 s → 2 s → 4 s (with ±200 ms jitter).

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      const isRateLimit =
        err instanceof Anthropic.RateLimitError ||
        (err instanceof Anthropic.APIError &&
          (err.status === 429 || err.status === 529));

      if (!isRateLimit || attempt === RETRY_DELAYS_MS.length) {
        break;
      }

      const baseDelay = RETRY_DELAYS_MS[attempt];
      const jitter = Math.floor(Math.random() * 400) - 200; // ±200 ms
      const delay = baseDelay + jitter;
      log.warn(
        { label, attempt: attempt + 1, delay },
        "Anthropic rate-limit hit — retrying"
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------
// Tracks errors over a rolling 1-minute window. When the error rate exceeds
// 50% across a minimum sample size, opens the circuit and returns a fallback
// result instead of calling the API.

interface CircuitWindow {
  expiresAt: number;
  successes: number;
  failures: number;
}

class CircuitBreaker {
  private window: CircuitWindow;
  private readonly windowMs = 60_000; // 1 minute
  private readonly errorThreshold = 0.5; // 50%
  private readonly minSamples = 5;

  constructor() {
    this.window = this.freshWindow();
  }

  private freshWindow(): CircuitWindow {
    return { expiresAt: Date.now() + this.windowMs, successes: 0, failures: 0 };
  }

  private rotate() {
    if (Date.now() > this.window.expiresAt) {
      this.window = this.freshWindow();
    }
  }

  isOpen(): boolean {
    this.rotate();
    const total = this.window.successes + this.window.failures;
    if (total < this.minSamples) return false;
    return this.window.failures / total > this.errorThreshold;
  }

  recordSuccess() {
    this.rotate();
    this.window.successes++;
  }

  recordFailure() {
    this.rotate();
    this.window.failures++;
  }

  stats() {
    this.rotate();
    const total = this.window.successes + this.window.failures;
    return {
      open: this.isOpen(),
      successRate: total === 0 ? 1 : this.window.successes / total,
      total,
      windowExpiresAt: new Date(this.window.expiresAt).toISOString(),
    };
  }
}

export const circuitBreaker = new CircuitBreaker();

// ---------------------------------------------------------------------------
// JSON extraction helper with strict validation
// ---------------------------------------------------------------------------

function extractAndValidateJson<T>(
  text: string,
  schema: z.ZodSchema<T>,
  label: string
): T {
  // Strip markdown fences if present
  const cleaned = text.replace(/```(?:json)?/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    log.error({ label, text: text.slice(0, 200) }, "AI response is not valid JSON");
    throw new Error(`AI response is not valid JSON: ${err}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    log.error(
      { label, issues: result.error.issues, parsed },
      "AI response failed schema validation"
    );
    throw new Error(`AI response schema validation failed: ${result.error.message}`);
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Single structured AI analysis call
// ---------------------------------------------------------------------------
// Consolidates NLP + explanation + mediation into ONE API call.
// The LLM outputs: { sentiment, emotion, language, explanation, mediationSuggestion? }
// The application code computes: tensionScore, riskLevel, signals, trend.

export interface AiAnalysisInput {
  messageText: string;
  signalsSummary: string;   // compact derived-signal summary (no raw text beyond current message)
  contextSummary: string;   // conversation context (display names + signals, no PII)
  shouldGenerateNudge: boolean; // only generate nudge when tension is already elevated
}

export async function analyzeMessage(input: AiAnalysisInput): Promise<AiResponse> {
  const nudgeInstruction = input.shouldGenerateNudge
    ? `\n- "mediationSuggestion": a brief, private, non-judgmental nudge for the person who sent this message. Keep it supportive and under 80 words.`
    : `\n- "mediationSuggestion": null (tension is not yet elevated enough to warrant a nudge)`;

  return withRetry(async () => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Analyze this chat message and conversation context. Respond ONLY with a valid JSON object — no markdown, no preamble.

Required fields:
- "sentiment": number from -1 (very negative) to 1 (very positive)
- "emotion": string — single primary emotion label (e.g. "anger", "frustration", "neutral", "joy", "anxiety")
- "language": ISO 639-1 code (e.g. "en")
- "explanation": one sentence describing the emotional tone${nudgeInstruction}

Message: """${input.messageText}"""

Recent context: """${input.contextSummary}"""`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI response contained no text block");
    }

    return extractAndValidateJson(textBlock.text, AiResponseSchema, "analyzeMessage");
  }, "analyzeMessage");
}

// ---------------------------------------------------------------------------
// Fallback result when circuit breaker is open
// ---------------------------------------------------------------------------

export interface AiAnalysisFallback {
  isFallback: true;
  sentiment: 0;
  emotion: null;
  explanation: string;
  mediationSuggestion: null;
}

export const AI_FALLBACK: AiAnalysisFallback = {
  isFallback: true,
  sentiment: 0,
  emotion: null,
  explanation: "Analysis unavailable — AI service temporarily degraded.",
  mediationSuggestion: null,
};

// ---------------------------------------------------------------------------
// Orchestrated analysis — main entry point for the BullMQ worker
// ---------------------------------------------------------------------------

export interface AnalyzeThreadInput {
  messageText: string;
  signalsSummary: string;
  contextSummary: string;
  previousTensionScore?: number;
}

export type AnalyzeThreadResult =
  | (AiResponse & { isFallback: false })
  | AiAnalysisFallback;

export async function analyzeThread(
  input: AnalyzeThreadInput
): Promise<AnalyzeThreadResult> {
  // Check circuit breaker before touching the API.
  if (circuitBreaker.isOpen()) {
    log.warn("Circuit breaker open — returning fallback analysis result");
    return AI_FALLBACK;
  }

  try {
    const previousScore = input.previousTensionScore ?? 0;
    // Only generate nudge if previous tension was already elevated
    const shouldGenerateNudge = previousScore >= 0.3;

    const result = await analyzeMessage({
      messageText: input.messageText,
      signalsSummary: input.signalsSummary,
      contextSummary: input.contextSummary,
      shouldGenerateNudge,
    });

    circuitBreaker.recordSuccess();

    log.info(
      { sentiment: result.sentiment, emotion: result.emotion, isFallback: false },
      "AI analysis complete"
    );

    return { ...result, isFallback: false };
  } catch (err: unknown) {
    circuitBreaker.recordFailure();
    log.error({ err }, "AI pipeline error — all retries exhausted");
    return AI_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toEscalationLabel(tensionScore01: number): EscalationLevelLabel {
  if (tensionScore01 >= 0.75) return "CRITICAL";
  if (tensionScore01 >= 0.5) return "HIGH";
  if (tensionScore01 >= 0.3) return "MEDIUM";
  return "LOW";
}
