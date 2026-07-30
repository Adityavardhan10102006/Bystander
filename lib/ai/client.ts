import Anthropic from "@anthropic-ai/sdk";
import type { NlpAnalysis, ConflictPrediction, NudgeSuggestion } from "@/types/pipeline";

// Single hosted provider for both NLP analysis and mediation generation.
// This is the Option A decision: no self-hosted RoBERTa/DeBERTa/spaCy,
// no Python process — one hosted model call per analysis stage.

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

// --- Stage 1: NLP analysis (sentiment, emotion, language, embedding proxy) ---
// Note: for a real embedding vector, pair this with a dedicated embeddings
// endpoint (e.g. Voyage AI) rather than asking the chat model to emit one.
export async function analyzeMessage(text: string): Promise<Omit<NlpAnalysis, "embedding">> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
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
}

// --- Stage 2: Conflict prediction from recent thread signals ---
// signalsSummary is a compact description of recent messages' derived
// signals (sentiment trend, reply gaps, interruptions) — never raw text
// beyond what's needed for the current analysis window.
export async function predictConflict(signalsSummary: string): Promise<ConflictPrediction> {
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
}

// --- Stage 3: Mediation / nudge generation ---
export async function generateNudge(
  context: string,
  prediction: ConflictPrediction
): Promise<NudgeSuggestion> {
  const level = prediction.tensionScore > 0.8 ? 4 : prediction.tensionScore > 0.6 ? 3 : prediction.tensionScore > 0.4 ? 2 : 1;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
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
  const parsed = extractJson<{ message: string; rationale: string }>(textBlock.text);
  return { level, ...parsed };
}
