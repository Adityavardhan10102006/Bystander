/**
 * lib/demo/data.ts — Deterministic hackathon demo scenario.
 *
 * This module provides a realistic demo dataset that demonstrates the full
 * Bystander value proposition without requiring a real Discord server.
 *
 * ⚠️  DEMO DATA — clearly marked in all API responses via `isDemoMode: true`.
 * NEVER use this data in production. Enable with DEMO_MODE=true in .env.
 *
 * Demo scenario:
 *   Stage 1: LOW tension (0.18) — normal discussion
 *   Stage 2: MEDIUM tension (0.42) — disagreement emerging
 *   Stage 3: HIGH tension (0.67) — escalation detected
 *   Stage 4: CRITICAL tension (0.83) — intervention triggered
 *   [NUDGE SENT]
 *   Stage 5: HIGH tension (0.61) — nudge received
 *   Stage 6: MEDIUM tension (0.38) — de-escalation
 *   Stage 7: LOW tension (0.21) — recovery
 */

const DEMO_THREAD_ID = "demo-thread-001";
const DEMO_EXTERNAL_ID = "1234567890";
const NOW = new Date();

function minutesAgo(n: number): string {
  return new Date(NOW.getTime() - n * 60_000).toISOString();
}

/** A single tension snapshot in the demo timeline */
interface DemoSnapshot {
  id: string;
  tensionScore: number;
  riskLevel: string;
  trend: number;
  signalsFired: string[];
  signalLabels: string[];
  mediationSuggestion: string | null;
  createdAt: string;
}

/** A demo intervention record */
interface DemoIntervention {
  id: string;
  platformUserId: string;
  message: string;
  status: "SENT" | "FAILED";
  createdAt: string;
  sentAt: string;
}

/** The demo tension history, ordered newest first */
export const DEMO_TENSION_HISTORY: DemoSnapshot[] = [
  {
    id: "snap-7",
    tensionScore: 0.21,
    riskLevel: "LOW",
    trend: -0.17,
    signalsFired: [],
    signalLabels: [],
    mediationSuggestion: null,
    createdAt: minutesAgo(1),
  },
  {
    id: "snap-6",
    tensionScore: 0.38,
    riskLevel: "MEDIUM",
    trend: -0.23,
    signalsFired: ["NEGATIVE_SENTIMENT"],
    signalLabels: ["Negative sentiment detected"],
    mediationSuggestion: null,
    createdAt: minutesAgo(2),
  },
  {
    id: "snap-5",
    tensionScore: 0.61,
    riskLevel: "HIGH",
    trend: -0.22,
    signalsFired: ["NEGATIVE_SENTIMENT", "SENTIMENT_DETERIORATION"],
    signalLabels: ["Negative sentiment detected", "Sentiment is deteriorating"],
    mediationSuggestion: null,
    createdAt: minutesAgo(3),
  },
  // INTERVENTION was sent between snap-4 and snap-5
  {
    id: "snap-4",
    tensionScore: 0.83,
    riskLevel: "CRITICAL",
    trend: 0.16,
    signalsFired: [
      "NEGATIVE_SENTIMENT",
      "SENTIMENT_DETERIORATION",
      "RAPID_REPLY_BURST",
      "ESCALATION_PATTERN",
      "AGGRESSIVE_LANGUAGE",
    ],
    signalLabels: [
      "Negative sentiment detected",
      "Sentiment is deteriorating",
      "Rapid reply burst",
      "Escalating tension pattern",
      "Aggressive language detected",
    ],
    mediationSuggestion:
      "Hey, it sounds like this discussion is getting pretty heated. Before responding, maybe take a moment — sometimes a brief pause helps keep things constructive. You've both got valid points worth hearing.",
    createdAt: minutesAgo(4),
  },
  {
    id: "snap-3",
    tensionScore: 0.67,
    riskLevel: "HIGH",
    trend: 0.25,
    signalsFired: [
      "NEGATIVE_SENTIMENT",
      "RAPID_REPLY_BURST",
      "REPEATED_DISAGREEMENT",
    ],
    signalLabels: [
      "Negative sentiment detected",
      "Rapid reply burst",
      "Repeated disagreement",
    ],
    mediationSuggestion:
      "This conversation seems to be escalating. Consider acknowledging the other person's perspective before making your point.",
    createdAt: minutesAgo(5),
  },
  {
    id: "snap-2",
    tensionScore: 0.42,
    riskLevel: "MEDIUM",
    trend: 0.24,
    signalsFired: ["NEGATIVE_SENTIMENT", "SENTIMENT_DETERIORATION"],
    signalLabels: ["Negative sentiment detected", "Sentiment is deteriorating"],
    mediationSuggestion: null,
    createdAt: minutesAgo(6),
  },
  {
    id: "snap-1",
    tensionScore: 0.18,
    riskLevel: "LOW",
    trend: 0,
    signalsFired: [],
    signalLabels: [],
    mediationSuggestion: null,
    createdAt: minutesAgo(7),
  },
];

/** Demo intervention record */
export const DEMO_INTERVENTION: DemoIntervention = {
  id: "intervention-demo-001",
  platformUserId: "demo-user-alex",
  message:
    "Hey, it sounds like this discussion is getting pretty heated. Before responding, maybe take a moment — sometimes a brief pause helps keep things constructive. You've both got valid points worth hearing.",
  status: "SENT",
  createdAt: minutesAgo(3.5),
  sentAt: minutesAgo(3.5),
};

/** Demo messages (conversation transcript) */
export const DEMO_MESSAGES = [
  {
    id: "msg-1",
    rawText: "Hey team, I think we should migrate to the new framework next sprint.",
    sentAt: minutesAgo(7),
    member: { displayName: "Alex", platformUserId: "demo-user-alex" },
    signal: { sentiment: 0.4, emotion: "neutral", interruption: false },
  },
  {
    id: "msg-2",
    rawText: "I disagree. We've been down this road before and it always causes delays.",
    sentAt: minutesAgo(6.5),
    member: { displayName: "Jordan", platformUserId: "demo-user-jordan" },
    signal: { sentiment: -0.3, emotion: "skepticism", interruption: false },
  },
  {
    id: "msg-3",
    rawText: "That's because the team never actually commits to finishing it properly.",
    sentAt: minutesAgo(6),
    member: { displayName: "Alex", platformUserId: "demo-user-alex" },
    signal: { sentiment: -0.5, emotion: "frustration", interruption: false },
  },
  {
    id: "msg-4",
    rawText: "Wow. Really? Because last time it was YOUR plan that fell apart, Alex.",
    sentAt: minutesAgo(5.5),
    member: { displayName: "Jordan", platformUserId: "demo-user-jordan" },
    signal: { sentiment: -0.7, emotion: "anger", interruption: true },
  },
  {
    id: "msg-5",
    rawText: "At least I try to move the product forward instead of blocking everything.",
    sentAt: minutesAgo(5),
    member: { displayName: "Alex", platformUserId: "demo-user-alex" },
    signal: { sentiment: -0.65, emotion: "frustration", interruption: true },
  },
  {
    id: "msg-6",
    rawText: "You know what, forget it. I'll just raise it in the retro.",
    sentAt: minutesAgo(4.5),
    member: { displayName: "Jordan", platformUserId: "demo-user-jordan" },
    signal: { sentiment: -0.6, emotion: "resignation", interruption: false },
  },
  // After nudge sent (minutesAgo 3.5)
  {
    id: "msg-7",
    rawText: "Wait, sorry — that came out harsh. I'm stressed about the deadline.",
    sentAt: minutesAgo(3),
    member: { displayName: "Alex", platformUserId: "demo-user-alex" },
    signal: { sentiment: -0.1, emotion: "regret", interruption: false },
  },
  {
    id: "msg-8",
    rawText: "No, I get it. I'm also under a lot of pressure. Can we talk it through?",
    sentAt: minutesAgo(2),
    member: { displayName: "Jordan", platformUserId: "demo-user-jordan" },
    signal: { sentiment: 0.2, emotion: "conciliation", interruption: false },
  },
  {
    id: "msg-9",
    rawText: "Yeah, let's do that. I'll set up a meeting for tomorrow morning.",
    sentAt: minutesAgo(1),
    member: { displayName: "Alex", platformUserId: "demo-user-alex" },
    signal: { sentiment: 0.5, emotion: "relief", interruption: false },
  },
];

/** Build the demo thread object */
function buildDemoThread(teamId: string) {
  return {
    id: DEMO_THREAD_ID,
    teamId,
    externalId: DEMO_EXTERNAL_ID,
    platform: "DISCORD",
    guildId: "demo-guild",
    status: "ACTIVE",
    createdAt: minutesAgo(8),
    closedAt: null,
    purgedAt: null,
    tensionHistory: DEMO_TENSION_HISTORY,
    messages: DEMO_MESSAGES,
    interventions: [DEMO_INTERVENTION],
    // Summary stats for the dashboard
    _isDemoThread: true,
  };
}

/** Returns the full demo dashboard payload */
export function getDemoDashboard(teamId: string) {
  const thread = buildDemoThread(teamId);
  const latestSnapshot = DEMO_TENSION_HISTORY[0];

  return {
    teamId,
    isDemoMode: true,
    threads: [thread],
    summary: {
      activeThreads: 1,
      flaggedThreads: 1,
      averageTension: latestSnapshot.tensionScore,
      interventionsSent: 1,
      recoveredThreads: 1,
    },
  };
}

/** Returns the full demo conversation detail */
export function getDemoConversation(teamId: string) {
  return {
    ...buildDemoThread(teamId),
    team: {
      id: teamId,
      name: "Demo Team",
    },
    isDemoMode: true,
  };
}
