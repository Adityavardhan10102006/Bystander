/**
 * lib/risk/thresholds.ts — Risk level thresholds and mappings.
 *
 * All thresholds are centralized here so they can be tuned in one place.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_THRESHOLDS = {
  /** 0.0 – 0.29 = LOW */
  LOW: 0,
  /** 0.30 – 0.49 = MEDIUM */
  MEDIUM: 0.3,
  /** 0.50 – 0.74 = HIGH */
  HIGH: 0.5,
  /** 0.75 – 1.00 = CRITICAL */
  CRITICAL: 0.75,
} as const;

/**
 * Derive the risk level label from a 0–1 tension score.
 */
export function toRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= RISK_THRESHOLDS.HIGH) return "HIGH";
  if (score >= RISK_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/**
 * Trend interpretation thresholds.
 * delta > RISING_THRESHOLD → rising
 * delta < -FALLING_THRESHOLD → falling
 * otherwise → stable
 */
export const TREND_THRESHOLDS = {
  RISING: 0.05,
  FALLING: 0.05,
} as const;

export type TrendDirection = "rising" | "falling" | "stable";

export function toTrendDirection(delta: number): TrendDirection {
  if (delta > TREND_THRESHOLDS.RISING) return "rising";
  if (delta < -TREND_THRESHOLDS.FALLING) return "falling";
  return "stable";
}

/**
 * Tension threshold above which a nudge should be automatically suggested.
 */
export const NUDGE_THRESHOLD = 0.4;

/**
 * Tension threshold above which the dashboard should highlight the thread.
 */
export const ALERT_THRESHOLD = 0.3;
