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
