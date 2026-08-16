/**
 * lib/risk/score.ts — Deterministic conflict risk scoring engine.
 *
 * The LLM provides:
 *   - Sentiment score (-1 to 1)
 *   - Emotion label
 *   - Explanation text
 *   - Mediation suggestion
 *
 * This engine computes (from measurable data):
 *   - Which signals fired
 *   - The final tensionScore (0–1)
 *   - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
 *   - Trend direction
 *   - Confidence
 *
 * The LLM NEVER controls the final numerical score. This ensures:
 *   - Determinism: same input → same score
 *   - Auditability: every score is explainable from signals
 *   - Trustworthiness: no hallucinated scores
 */

import { computeSignals, type Signal, type SignalInput } from "./signals";
import { toRiskLevel, toTrendDirection, type RiskLevel, type TrendDirection } from "./thresholds";

// ---------------------------------------------------------------------------
// Signal weights — how much each signal contributes to the final score
// ---------------------------------------------------------------------------

const SIGNAL_WEIGHTS: Record<string, number> = {
  NEGATIVE_SENTIMENT: 0.25,
  SENTIMENT_DETERIORATION: 0.20,
  AGGRESSIVE_LANGUAGE: 0.20,
  ESCALATION_PATTERN: 0.15,
  REPEATED_DISAGREEMENT: 0.10,
  RAPID_REPLY_BURST: 0.05,
  HIGH_MESSAGE_FREQUENCY: 0.02,
  SENTIMENT_VOLATILITY: 0.01,
  SHORT_REPLY_GAP: 0.01,
  DIRECT_ATTRIBUTION: 0.01,
};

/** Severity multipliers applied on top of weights */
const SEVERITY_MULTIPLIERS = {
  LOW: 0.5,
  MEDIUM: 1.0,
  HIGH: 1.5,
};

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

export interface RiskScoreResult {
  /** Final tension score: 0–1. Computed from signals, not LLM output. */
  tensionScore: number;
  /** Risk level derived from tensionScore. */
  riskLevel: RiskLevel;
  /** Delta vs previous snapshot (positive = rising, negative = falling). */
  trend: number;
  /** Human-readable trend direction. */
  trendDirection: TrendDirection;
  /** Signals that fired (only those with weight > 0 that triggered). */
  signals: Signal[];
  /** Confidence: fraction of high-evidence signals vs total possible. */
  confidence: number;
  /** Signal codes as strings for DB storage. */
  signalCodes: string[];
  /** Human-readable signal labels for display. */
  signalLabels: string[];
}

/**
 * Compute a deterministic risk score from measured signals.
 *
 * @param signalInput   - Measured data from the message + thread history
 * @param previousScore - Previous TensionSnapshot.tensionScore (0–1), or 0 if none
 */
export function computeRiskScore(
  signalInput: SignalInput,
  previousScore: number = 0
): RiskScoreResult {
  // 1. Compute which signals fired
  const signals = computeSignals(signalInput);

  // 2. Compute weighted score from signals
  let rawScore = 0;
  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.code] ?? 0.01;
    const severityMultiplier = SEVERITY_MULTIPLIERS[signal.severity];
    rawScore += weight * severityMultiplier;
  }

  // 3. Apply smoothing: blend current signal score with previous score
  // This prevents score from swinging wildly between messages
  const SMOOTHING_FACTOR = 0.4; // 40% previous, 60% current signals
  const tensionScore = Math.min(
    1,
    Math.max(0, rawScore * (1 - SMOOTHING_FACTOR) + previousScore * SMOOTHING_FACTOR)
  );

  // 4. Compute trend
  const trend = tensionScore - previousScore;
  const trendDirection = toTrendDirection(trend);

  // 5. Compute risk level
  const riskLevel = toRiskLevel(tensionScore);

  // 6. Compute confidence: more signals + higher severity = higher confidence
  const highSeverityCount = signals.filter((s) => s.severity === "HIGH").length;
  const confidence = Math.min(1, signals.length * 0.15 + highSeverityCount * 0.1);

  return {
    tensionScore: Math.round(tensionScore * 1000) / 1000, // round to 3 decimal places
    riskLevel,
    trend: Math.round(trend * 1000) / 1000,
    trendDirection,
    signals,
    confidence: Math.round(confidence * 1000) / 1000,
    signalCodes: signals.map((s) => s.code),
    signalLabels: signals.map((s) => s.label),
  };
}
