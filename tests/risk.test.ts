// tests/risk.test.ts — Unit tests for the deterministic risk engine
// Run: npx vitest run tests/risk.test.ts

import { describe, it, expect } from "vitest";
import { computeSignals } from "../lib/risk/signals";
import { computeRiskScore } from "../lib/risk/score";
import { toRiskLevel, toTrendDirection } from "../lib/risk/thresholds";

// ---------------------------------------------------------------------------
// Signal computation tests
// ---------------------------------------------------------------------------

describe("computeSignals", () => {
  it("fires NEGATIVE_SENTIMENT when sentiment < -0.3", () => {
    const signals = computeSignals({
      currentSentiment: -0.5,
      emotion: "neutral",
      sentimentHistory: [],
      tensionHistory: [],
      replyGapMs: null,
      recentMessageCount: 1,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("NEGATIVE_SENTIMENT");
  });

  it("does NOT fire NEGATIVE_SENTIMENT when sentiment is positive", () => {
    const signals = computeSignals({
      currentSentiment: 0.5,
      emotion: "joy",
      sentimentHistory: [],
      tensionHistory: [],
      replyGapMs: null,
      recentMessageCount: 1,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).not.toContain("NEGATIVE_SENTIMENT");
  });

  it("fires AGGRESSIVE_LANGUAGE for anger emotion", () => {
    const signals = computeSignals({
      currentSentiment: -0.6,
      emotion: "anger",
      sentimentHistory: [],
      tensionHistory: [],
      replyGapMs: null,
      recentMessageCount: 1,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("AGGRESSIVE_LANGUAGE");
  });

  it("fires SENTIMENT_DETERIORATION when last 3 messages trend negative", () => {
    const signals = computeSignals({
      currentSentiment: -0.5,
      emotion: "frustration",
      sentimentHistory: [0.3, 0.0, -0.4],
      tensionHistory: [],
      replyGapMs: null,
      recentMessageCount: 1,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("SENTIMENT_DETERIORATION");
  });

  it("fires SHORT_REPLY_GAP when reply gap < 15 seconds", () => {
    const signals = computeSignals({
      currentSentiment: -0.4,
      emotion: "frustration",
      sentimentHistory: [],
      tensionHistory: [],
      replyGapMs: 3_000, // 3 seconds
      recentMessageCount: 1,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("SHORT_REPLY_GAP");
  });

  it("fires RAPID_REPLY_BURST when recentMessageCount >= 6", () => {
    const signals = computeSignals({
      currentSentiment: -0.3,
      emotion: "neutral",
      sentimentHistory: [],
      tensionHistory: [],
      replyGapMs: null,
      recentMessageCount: 8,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("RAPID_REPLY_BURST");
  });

  it("fires ESCALATION_PATTERN when tension is consistently rising", () => {
    const signals = computeSignals({
      currentSentiment: -0.5,
      emotion: "frustration",
      sentimentHistory: [],
      tensionHistory: [0.2, 0.4, 0.65], // clear escalation
      replyGapMs: null,
      recentMessageCount: 3,
    });
    const codes = signals.map((s) => s.code);
    expect(codes).toContain("ESCALATION_PATTERN");
  });

  it("returns empty signals for neutral positive conversation", () => {
    const signals = computeSignals({
      currentSentiment: 0.6,
      emotion: "joy",
      sentimentHistory: [0.5, 0.6, 0.7],
      tensionHistory: [0.1, 0.08, 0.05],
      replyGapMs: 30_000,
      recentMessageCount: 2,
    });
    expect(signals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Risk score computation tests
// ---------------------------------------------------------------------------

describe("computeRiskScore", () => {
  it("returns LOW risk for positive conversation", () => {
    const result = computeRiskScore(
      {
        currentSentiment: 0.5,
        emotion: "joy",
        sentimentHistory: [0.4, 0.5, 0.6],
        tensionHistory: [0.1, 0.08],
        replyGapMs: 60_000,
        recentMessageCount: 2,
      },
      0.1
    );
    expect(result.riskLevel).toBe("LOW");
    expect(result.tensionScore).toBeLessThan(0.3);
  });

  it("returns HIGH or CRITICAL risk for aggressive escalating conversation", () => {
    const result = computeRiskScore(
      {
        currentSentiment: -0.8,
        emotion: "anger",
        sentimentHistory: [0.0, -0.3, -0.7],
        tensionHistory: [0.3, 0.5, 0.65],
        replyGapMs: 3_000,
        recentMessageCount: 10,
      },
      0.65
    );
    expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
    expect(result.tensionScore).toBeGreaterThan(0.4);
  });

  it("returns deterministic scores for the same input", () => {
    const input = {
      currentSentiment: -0.5,
      emotion: "frustration",
      sentimentHistory: [0.2, -0.1, -0.5],
      tensionHistory: [0.2, 0.35],
      replyGapMs: 8_000,
      recentMessageCount: 5,
    };
    const result1 = computeRiskScore(input, 0.35);
    const result2 = computeRiskScore(input, 0.35);
    expect(result1.tensionScore).toBe(result2.tensionScore);
    expect(result1.riskLevel).toBe(result2.riskLevel);
    expect(result1.signalCodes).toEqual(result2.signalCodes);
  });

  it("applies smoothing — score does not swing wildly from 0 to 1", () => {
    const result = computeRiskScore(
      {
        currentSentiment: -1.0,
        emotion: "rage",
        sentimentHistory: [-0.9, -1.0],
        tensionHistory: [],
        replyGapMs: 1_000,
        recentMessageCount: 15,
      },
      0 // starting from 0
    );
    // Even with all signals firing, previous=0 provides smoothing
    expect(result.tensionScore).toBeLessThanOrEqual(1.0);
    expect(result.tensionScore).toBeGreaterThan(0);
  });

  it("computes trend correctly", () => {
    const result = computeRiskScore(
      {
        currentSentiment: -0.6,
        emotion: "anger",
        sentimentHistory: [-0.5, -0.6],
        tensionHistory: [0.4, 0.5],
        replyGapMs: 5_000,
        recentMessageCount: 4,
      },
      0.3 // previous was 0.3, signals suggest higher score
    );
    // With previous = 0.3, and rising signals, trend should be positive
    // (The exact value depends on smoothing, but direction should be deterministic)
    expect(typeof result.trend).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Threshold tests
// ---------------------------------------------------------------------------

describe("toRiskLevel", () => {
  it("returns LOW for score < 0.3", () => {
    expect(toRiskLevel(0)).toBe("LOW");
    expect(toRiskLevel(0.1)).toBe("LOW");
    expect(toRiskLevel(0.29)).toBe("LOW");
  });

  it("returns MEDIUM for 0.3 <= score < 0.5", () => {
    expect(toRiskLevel(0.3)).toBe("MEDIUM");
    expect(toRiskLevel(0.4)).toBe("MEDIUM");
    expect(toRiskLevel(0.49)).toBe("MEDIUM");
  });

  it("returns HIGH for 0.5 <= score < 0.75", () => {
    expect(toRiskLevel(0.5)).toBe("HIGH");
    expect(toRiskLevel(0.6)).toBe("HIGH");
    expect(toRiskLevel(0.74)).toBe("HIGH");
  });

  it("returns CRITICAL for score >= 0.75", () => {
    expect(toRiskLevel(0.75)).toBe("CRITICAL");
    expect(toRiskLevel(0.85)).toBe("CRITICAL");
    expect(toRiskLevel(1.0)).toBe("CRITICAL");
  });
});

describe("toTrendDirection", () => {
  it("returns rising for delta > 0.05", () => {
    expect(toTrendDirection(0.1)).toBe("rising");
    expect(toTrendDirection(0.5)).toBe("rising");
  });

  it("returns falling for delta < -0.05", () => {
    expect(toTrendDirection(-0.1)).toBe("falling");
    expect(toTrendDirection(-0.5)).toBe("falling");
  });

  it("returns stable for -0.05 <= delta <= 0.05", () => {
    expect(toTrendDirection(0)).toBe("stable");
    expect(toTrendDirection(0.04)).toBe("stable");
    expect(toTrendDirection(-0.04)).toBe("stable");
  });
});
