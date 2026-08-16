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
  /** Discord channel ID or Slack channel ID — the immediate conversation context */
  externalThreadId: string;
  /** Discord guild (server) ID — the broader organizational context. Required for RBAC. */
  guildId?: string;
  platform: Platform;
  /** Platform-specific user ID (e.g. Discord snowflake) */
  platformUserId: string;
  /** Display name (e.g. Discord username). No email or personal data. */
  displayName: string;
  text: string;
  sentAt: string; // ISO timestamp
  /** Platform-native message ID for deduplication */
  externalMessageId?: string;
}

export interface NlpAnalysis {
  sentiment: number; // -1..1 — from AI
  emotion: string | null; // primary emotion label — from AI, null if fallback
  language: string; // ISO 639-1 code
  explanation: string; // one-sentence explanation from AI
}

export type EscalationLevel = 1 | 2 | 3 | 4;
export type EscalationLevelLabel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Full result of the analysis pipeline for one message. */
export interface AiAnalysisResult {
  /** Message sentiment: -1..1. From AI. */
  sentiment: number;
  /** Emotion label. From AI. Null when circuit breaker is open. */
  emotion: string | null;
  /** One-sentence explanation of message tone. From AI. */
  explanation: string;
  /** Mediation suggestion text. From AI. Null when tension is low or circuit breaker open. */
  mediationSuggestion: string | null;
  /** Whether this is a circuit-breaker fallback result. */
  isFallback: boolean;
}

/** Result of the deterministic risk engine for one message. */
export interface RiskResult {
  /** Tension score 0–1. Computed deterministically, NOT from LLM. */
  tensionScore: number;
  /** Risk level derived from tensionScore. */
  riskLevel: RiskLevel;
  /** Delta vs previous snapshot. */
  trend: number;
  /** Human-readable trend direction. */
  trendDirection: "rising" | "falling" | "stable";
  /** Signal codes that fired (for DB storage). */
  signalCodes: string[];
  /** Human-readable signal labels (for display). */
  signalLabels: string[];
  /** Confidence score 0–1. */
  confidence: number;
}
