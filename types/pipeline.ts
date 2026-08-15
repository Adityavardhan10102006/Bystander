// Shared contract types for the message -> analysis -> nudge pipeline.
// Explainability is part of the contract from day one: every score ships
// with the signals that fired, not just a number.

export type Platform =
  | "DISCORD"
  | "SLACK"
  | "TEAMS"
  | "WHATSAPP"
  | "TELEGRAM"
  | "GOOGLE_CHAT";

export interface NormalizedMessage {
  externalThreadId: string;
  platform: Platform;
  platformUserId: string;
  displayName: string;
  text: string;
  sentAt: string; // ISO timestamp
}

export interface NlpAnalysis {
  embedding: number[];
  sentiment: number; // -1..1
  emotion: string;
  language: string;
}

export interface ConflictPrediction {
  tensionScore: number; // 0..1
  trend: number; // delta vs previous snapshot
  confidence: number; // 0..1
  signalsFired: string[]; // e.g. ["3 unanswered questions", "tone shift detected"]
}

export type EscalationLevel = 1 | 2 | 3 | 4;

export interface NudgeSuggestion {
  level: EscalationLevel;
  message: string; // private suggestion text (rewrite, apology draft, check-in prompt)
  rationale: string;
}

// ---------------------------------------------------------------------------
// Phase 1 additions — structured AI response type
// ---------------------------------------------------------------------------
// These extend the contract without altering the existing interfaces above.
// The tensionScore here is 0–100 (human-readable scale) rather than the
// internal 0–1 used by ConflictPrediction. Mapping: tensionScore * 100.

export type EscalationLevelLabel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Aggregated result returned by the full NLP → prediction → mediation pipeline. */
export interface AiAnalysisResult {
  /** Overall tension level, 0–100 scale (maps from ConflictPrediction.tensionScore × 100). */
  tensionScore: number;
  /** Human-readable escalation tier derived from tensionScore. */
  escalationLevel: EscalationLevelLabel;
  /** Message-level sentiment, -1 (very negative) to 1 (very positive). */
  sentiment: number;
  /** Private mediation suggestion text to deliver to the next sender. */
  mediationSuggestion: string;
  /** Short human-readable signals that drove this assessment (for explainability). */
  signalsFired: string[];
  /** Model confidence, 0–1. */
  confidence: number;
  /** True when the circuit breaker short-circuited and the result is a fallback. */
  isFallback?: boolean;
}
