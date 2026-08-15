import Anthropic from "@anthropic-ai/sdk";
import type {
  NlpAnalysis,
  ConflictPrediction,
  NudgeSuggestion,
  AiAnalysisResult,
  EscalationLevelLabel,
} from "@/types/pipeline";
import { logger } from "@/lib/logger";

// Single hosted provider for both NLP analysis and mediation generation.
// This is the Option A decision: no self-hosted RoBERTa/DeBERTa/spaCy,
// no Python process — one hosted model call per analysis stage.

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

const log = logger.child({ module: "ai-client" });

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

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
        // Non-transient error, or exhausted retries — rethrow.
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
// result instead of calling the API (preventing cascading failures).

interface CircuitWindow {
  /** Unix timestamp (ms) when this bucket expires. */
  expiresAt: number;
  successes: number;
  failures: number;
}

class CircuitBreaker {
  private window: CircuitWindow;
  private readonly windowMs = 60_000; // 1 minute
  private readonly errorThreshold = 0.5; // 50%
  private readonly minSamples = 5; // need at least 5 calls before tripping

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

  /** Returns true when the circuit is open (too many errors — skip API call). */
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

  /** Diagnostic snapshot (for /api/health). */
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

// Module-level singleton — shared across all AI calls in this process.
export const circuitBreaker = new CircuitBreaker();

// Fallback result returned when the circuit is open.
const FALLBACK_RESULT: AiAnalysisResult = {
  tensionScore: 0,
  escalationLevel: "LOW",
  sentiment: 0,
  mediationSuggestion: "Analysis unavailable — AI service temporarily degraded.",
  signalsFired: ["circuit-breaker-open"],
  confidence: 0,
  isFallback: true,
};

// ---------------------------------------------------------------------------
// Stage 1: NLP analysis (sentiment, emotion, language, embedding proxy)
// ---------------------------------------------------------------------------
// Note: for a real embedding vector, pair this with a dedicated embeddings
// endpoint (e.g. Voyage AI) rather than asking the chat model to emit one.
export async function analyzeMessage(
  text: string
): Promise<Omit<NlpAnalysis, "embedding">> {
  return withRetry(async () => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          // PII constraint: only the message text (no username, no thread context).
          content: `Analyze this chat message. Respond ONLY with JSON, no preamble, no markdown fences.
Schema: { "sentiment": number (-1 to 1), "emotion": string (single primary emotion), "language": string (ISO 639-1 code) }

Message: """${text}"""`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI analysis returned no text block");
    }
    return extractJson(textBlock.text);
  }, "analyzeMessage");
}

// ---------------------------------------------------------------------------
// Stage 2: Conflict prediction from recent thread signals
// ---------------------------------------------------------------------------
// signalsSummary is a compact description of recent messages' derived
// signals (sentiment trend, reply gaps, interruptions) — never raw text
// beyond what's needed for the current analysis window.
export async function predictConflict(
  signalsSummary: string
): Promise<ConflictPrediction> {
  return withRetry(async () => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Given this summary of recent conversation signals, assess conflict risk.
Respond ONLY with JSON, no preamble, no markdown fences.
Schema: { "tensionScore": number (0-1), "trend": number (delta vs previous), "confidence": number (0-1), "signalsFired": string[] (short human-readable reasons, e.g. "3 unanswered questions", "tone shift detected") }

Signals: """${signalsSummary}"""`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI prediction returned no text block");
    }
    return extractJson(textBlock.text);
  }, "predictConflict");
}

// ---------------------------------------------------------------------------
// Stage 3: Mediation / nudge generation
// ---------------------------------------------------------------------------
export async function generateNudge(
  context: string,
  prediction: ConflictPrediction
): Promise<NudgeSuggestion> {
  const level =
    prediction.tensionScore > 0.8
      ? 4
      : prediction.tensionScore > 0.6
      ? 3
      : prediction.tensionScore > 0.4
      ? 2
      : 1;

  return withRetry(async () => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          // PII constraint: context contains only derived signals + display name,
          // NOT raw message text.
          content: `Conversation context: """${context}"""
Detected signals: ${prediction.signalsFired.join(", ")}
Tension score: ${prediction.tensionScore}

Draft a brief, private, non-judgmental nudge for the person about to send their next message (e.g. a gentle rewrite suggestion or a check-in prompt). Respond ONLY with JSON, no preamble, no markdown fences.
Schema: { "message": string, "rationale": string (one sentence, why this nudge) }`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI nudge generation returned no text block");
    }
    const parsed = extractJson<{ message: string; rationale: string }>(
      textBlock.text
    );
    return { level, ...parsed };
  }, "generateNudge");
}

// ---------------------------------------------------------------------------
// Orchestrated pipeline — runs all 3 stages and returns AiAnalysisResult
// ---------------------------------------------------------------------------
// This is the main entry point for the BullMQ worker.
//
// Inputs:
//   messageText    — the raw message text (for NLP stage only)
//   signalsSummary — compact derived-signal summary (for prediction stage)
//   contextSummary — conversation context summary (for nudge stage; no PII beyond displayName)
//   previousTensionScore — 0..1, used to compute trend

export async function analyzeThread({
  messageText,
  signalsSummary,
  contextSummary,
  previousTensionScore = 0,
}: {
  messageText: string;
  signalsSummary: string;
  contextSummary: string;
  previousTensionScore?: number;
}): Promise<AiAnalysisResult> {
  // Check circuit breaker before touching the API.
  if (circuitBreaker.isOpen()) {
    log.warn("Circuit breaker open — returning fallback analysis result");
    return FALLBACK_RESULT;
  }

  try {
    // Stage 1: NLP
    const nlp = await analyzeMessage(messageText);

    // Stage 2: Conflict prediction
    const prediction = await predictConflict(signalsSummary);

    // Stage 3: Nudge / mediation
    const nudge = await generateNudge(contextSummary, prediction);

    circuitBreaker.recordSuccess();

    // Map tensionScore 0..1 → 0..100, derive escalationLevel.
    const tensionScore100 = Math.round(prediction.tensionScore * 100);
    const escalationLevel = toEscalationLabel(prediction.tensionScore);

    log.info(
      { tensionScore: tensionScore100, escalationLevel, isFallback: false },
      "AI analysis complete"
    );

    return {
      tensionScore: tensionScore100,
      escalationLevel,
      sentiment: nlp.sentiment,
      mediationSuggestion: nudge.message,
      signalsFired: prediction.signalsFired,
      confidence: prediction.confidence,
      isFallback: false,
    };
  } catch (err: unknown) {
    circuitBreaker.recordFailure();
    log.error({ err }, "AI pipeline error — all retries exhausted");
    // Return fallback rather than propagating so the worker doesn't crash.
    return { ...FALLBACK_RESULT };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEscalationLabel(tensionScore01: number): EscalationLevelLabel {
  if (tensionScore01 >= 0.8) return "CRITICAL";
  if (tensionScore01 >= 0.6) return "HIGH";
  if (tensionScore01 >= 0.4) return "MEDIUM";
  return "LOW";
}
