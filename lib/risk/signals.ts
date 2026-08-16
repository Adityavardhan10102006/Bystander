/**
 * lib/risk/signals.ts — Measurable signal definitions.
 *
 * Every signal has:
 *   - A machine-readable code
 *   - A human-readable label (shown in the dashboard)
 *   - A measured value (not LLM-invented)
 *   - A severity level
 *   - source: "computed" — all signals come from measurable data
 *
 * The LLM can EXPLAIN these signals, but NEVER invents them.
 */

export type SignalCode =
  | "NEGATIVE_SENTIMENT"           // Current message sentiment below threshold
  | "SENTIMENT_DETERIORATION"      // Sentiment trending more negative over time
  | "RAPID_REPLY_BURST"            // Messages arriving faster than normal
  | "REPEATED_DISAGREEMENT"        // Multiple negative messages in sequence
  | "AGGRESSIVE_LANGUAGE"          // High-intensity negative emotion detected
  | "DIRECT_ATTRIBUTION"           // Blame/accusation language detected
  | "ESCALATION_PATTERN"           // Score rising across last N snapshots
  | "HIGH_MESSAGE_FREQUENCY"       // Unusually high message rate
  | "SENTIMENT_VOLATILITY"         // Large variance in sentiment across messages
  | "SHORT_REPLY_GAP";             // Very fast replies (< threshold ms)

export type SignalSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface Signal {
  /** Machine-readable signal code for deduplication and filtering */
  code: SignalCode;
  /** Human-readable label shown in the dashboard */
  label: string;
  /** The measured value that triggered this signal */
  value: number;
  /** Severity tier */
  severity: SignalSeverity;
  /** All Bystander signals are computed from real data, not invented by LLM */
  source: "computed";
}

/** Human-readable labels for each signal code */
export const SIGNAL_LABELS: Record<SignalCode, string> = {
  NEGATIVE_SENTIMENT: "Negative sentiment detected",
  SENTIMENT_DETERIORATION: "Sentiment is deteriorating",
  RAPID_REPLY_BURST: "Rapid reply burst",
  REPEATED_DISAGREEMENT: "Repeated disagreement",
  AGGRESSIVE_LANGUAGE: "Aggressive language detected",
  DIRECT_ATTRIBUTION: "Direct blame/accusation",
  ESCALATION_PATTERN: "Escalating tension pattern",
  HIGH_MESSAGE_FREQUENCY: "High message frequency",
  SENTIMENT_VOLATILITY: "High sentiment volatility",
  SHORT_REPLY_GAP: "Very fast replies",
};

/**
 * Input data for signal computation.
 * Derived from AI output + historical thread data.
 */
export interface SignalInput {
  /** Current message sentiment from AI (-1 to 1) */
  currentSentiment: number;
  /** Emotion label from AI (e.g. "anger", "frustration", "neutral") */
  emotion: string;
  /** Recent sentiment history (last N messages), oldest first */
  sentimentHistory: number[];
  /** Recent tension score history (0-1), oldest first */
  tensionHistory: number[];
  /** Time since previous message in ms (null if first message) */
  replyGapMs: number | null;
  /** Number of messages in the last 5 minutes */
  recentMessageCount: number;
}

/**
 * Compute all measurable signals from the input data.
 * Returns an array of fired signals (only signals that actually triggered).
 */
export function computeSignals(input: SignalInput): Signal[] {
  const signals: Signal[] = [];

  // ── NEGATIVE_SENTIMENT ────────────────────────────────────────────────────
  if (input.currentSentiment < -0.3) {
    signals.push({
      code: "NEGATIVE_SENTIMENT",
      label: SIGNAL_LABELS.NEGATIVE_SENTIMENT,
      value: input.currentSentiment,
      severity: input.currentSentiment < -0.7 ? "HIGH" : "MEDIUM",
      source: "computed",
    });
  }

  // ── AGGRESSIVE_LANGUAGE ───────────────────────────────────────────────────
  const aggressiveEmotions = ["anger", "rage", "hostility", "contempt", "disgust"];
  if (aggressiveEmotions.some((e) => input.emotion.toLowerCase().includes(e))) {
    signals.push({
      code: "AGGRESSIVE_LANGUAGE",
      label: SIGNAL_LABELS.AGGRESSIVE_LANGUAGE,
      value: input.currentSentiment,
      severity: "HIGH",
      source: "computed",
    });
  }

  // ── SENTIMENT_DETERIORATION ───────────────────────────────────────────────
  if (input.sentimentHistory.length >= 3) {
    const recent = input.sentimentHistory.slice(-3);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const delta = newest - oldest;
    if (delta < -0.3) {
      signals.push({
        code: "SENTIMENT_DETERIORATION",
        label: SIGNAL_LABELS.SENTIMENT_DETERIORATION,
        value: delta,
        severity: delta < -0.6 ? "HIGH" : "MEDIUM",
        source: "computed",
      });
    }
  }

  // ── SENTIMENT_VOLATILITY ──────────────────────────────────────────────────
  if (input.sentimentHistory.length >= 4) {
    const mean = input.sentimentHistory.reduce((a, b) => a + b, 0) / input.sentimentHistory.length;
    const variance = input.sentimentHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / input.sentimentHistory.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0.4) {
      signals.push({
        code: "SENTIMENT_VOLATILITY",
        label: SIGNAL_LABELS.SENTIMENT_VOLATILITY,
        value: stdDev,
        severity: stdDev > 0.6 ? "HIGH" : "MEDIUM",
        source: "computed",
      });
    }
  }

  // ── REPEATED_DISAGREEMENT ─────────────────────────────────────────────────
  // More than 2 consecutive negative messages
  if (input.sentimentHistory.length >= 3) {
    const lastThree = input.sentimentHistory.slice(-3);
    if (lastThree.every((s) => s < -0.2)) {
      signals.push({
        code: "REPEATED_DISAGREEMENT",
        label: SIGNAL_LABELS.REPEATED_DISAGREEMENT,
        value: Math.min(...lastThree),
        severity: "MEDIUM",
        source: "computed",
      });
    }
  }

  // ── SHORT_REPLY_GAP ───────────────────────────────────────────────────────
  // Reply in under 15 seconds (may indicate hot emotional reaction)
  if (input.replyGapMs !== null && input.replyGapMs < 15_000 && input.replyGapMs > 0) {
    signals.push({
      code: "SHORT_REPLY_GAP",
      label: SIGNAL_LABELS.SHORT_REPLY_GAP,
      value: input.replyGapMs,
      severity: input.replyGapMs < 5_000 ? "HIGH" : "LOW",
      source: "computed",
    });
  }

  // ── RAPID_REPLY_BURST ─────────────────────────────────────────────────────
  if (input.recentMessageCount >= 6) {
    signals.push({
      code: "RAPID_REPLY_BURST",
      label: SIGNAL_LABELS.RAPID_REPLY_BURST,
      value: input.recentMessageCount,
      severity: input.recentMessageCount >= 10 ? "HIGH" : "MEDIUM",
      source: "computed",
    });
  }

  // ── ESCALATION_PATTERN ────────────────────────────────────────────────────
  if (input.tensionHistory.length >= 3) {
    const recent = input.tensionHistory.slice(-3);
    const isEscalating = recent[0] < recent[1] && recent[1] < recent[2];
    const escalationDelta = recent[recent.length - 1] - recent[0];
    if (isEscalating && escalationDelta > 0.15) {
      signals.push({
        code: "ESCALATION_PATTERN",
        label: SIGNAL_LABELS.ESCALATION_PATTERN,
        value: escalationDelta,
        severity: escalationDelta > 0.3 ? "HIGH" : "MEDIUM",
        source: "computed",
      });
    }
  }

  return signals;
}
