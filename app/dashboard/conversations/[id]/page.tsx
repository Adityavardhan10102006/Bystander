"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MessageCircle,
  AlertCircle,
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { TensionScore, LoadingState, ErrorState, EmptyState } from "../../../components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  rawText: string | null;
  sentAt: string;
  member: {
    displayName: string;
    platformUserId: string;
  };
  signal: {
    sentiment: number;
    emotion: string | null;
    interruption: boolean;
    signalCodes?: string[];
  } | null;
}

interface TensionSnapshot {
  id: string;
  tensionScore: number;
  riskLevel: string;
  trend: number;
  signalsFired: string[];
  signalLabels: string[];
  mediationSuggestion: string | null;
  createdAt: string;
}

interface Intervention {
  id: string;
  platformUserId: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | "DISMISSED" | "ACCEPTED";
  errorMessage?: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface ThreadDetail {
  id: string;
  teamId: string;
  externalId: string;
  guildId: string | null;
  platform: string;
  status: string;
  team: { name: string };
  messages: Message[];
  tensionHistory: TensionSnapshot[];
  interventions: Intervention[];
  isDemoMode?: boolean;
}

// ---------------------------------------------------------------------------
// Trend indicator
// ---------------------------------------------------------------------------

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
        <TrendingUp size={13} /> Rising
      </span>
    );
  }
  if (trend < -0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
        <TrendingDown size={13} /> Falling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold">
      <Minus size={13} /> Stable
    </span>
  );
}

// ---------------------------------------------------------------------------
// Intervention status badge
// ---------------------------------------------------------------------------

function InterventionBadge({ intervention }: { intervention: Intervention }) {
  const statusConfig = {
    PENDING: { icon: <Clock size={12} />, text: "Pending", className: "bg-slate-100 text-slate-600 border-slate-200" },
    SENT: { icon: <CheckCircle size={12} />, text: "Delivered", className: "bg-green-100 text-green-700 border-green-200" },
    FAILED: { icon: <XCircle size={12} />, text: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
    DISMISSED: { icon: <XCircle size={12} />, text: "Dismissed", className: "bg-slate-100 text-slate-600 border-slate-200" },
    ACCEPTED: { icon: <CheckCircle size={12} />, text: "Accepted", className: "bg-blue-100 text-blue-700 border-blue-200" },
  };

  const config = statusConfig[intervention.status] ?? statusConfig.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ConversationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSendingNudge, setIsSendingNudge] = useState(false);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/conversations/${params.id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch conversation: ${res.statusText}`);
      }
      const json = (await res.json()) as ThreadDetail;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages.length]);

  const handleSendNudge = async () => {
    if (!data) return;

    const latestSnapshot = data.tensionHistory[0];
    if (!latestSnapshot?.mediationSuggestion) return;

    // Find the most recent active participant to nudge
    const lastMessage = data.messages[data.messages.length - 1];
    if (!lastMessage) return;

    setIsSendingNudge(true);
    setNudgeError(null);

    try {
      const res = await fetch("/api/notification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: data.teamId,
          threadId: data.id,
          platformUserId: lastMessage.member.platformUserId,
          platform: data.platform,
          message: latestSnapshot.mediationSuggestion,
        }),
      });

      const result = (await res.json()) as {
        status?: string;
        error?: string;
        reason?: string;
      };

      if (!res.ok) {
        throw new Error(result.error ?? result.reason ?? "Failed to send nudge");
      }

      // Refresh to show updated intervention status
      await fetchData();
    } catch (err: unknown) {
      setNudgeError(err instanceof Error ? err.message : "Failed to send nudge");
    } finally {
      setIsSendingNudge(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading conversation details..." />;
  if (error) return <ErrorState error={error} retry={() => window.location.reload()} />;
  if (!data) return null;

  const latestTension = data.tensionHistory[0];
  const hasMediationSuggestion =
    latestTension?.tensionScore >= 0.3 && latestTension?.mediationSuggestion;
  const alreadySentNudge = data.interventions.some((i) => i.status === "SENT");

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 relative">
      {/* ── Main Chat Stream ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {data.platform} Thread: {data.externalId}
              </h2>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span
                  className={
                    data.status === "ACTIVE" ? "text-green-600" : "text-slate-500"
                  }
                >
                  {data.status}
                </span>
                <span>·</span>
                <span>{data.messages.length} messages</span>
                {data.isDemoMode && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 font-bold">DEMO</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {data.messages.length === 0 ? (
            <EmptyState
              title="No messages found"
              description="Raw text may have been purged per retention policy."
              icon={MessageCircle}
            />
          ) : (
            data.messages.map((msg, idx) => {
              const showHeader =
                idx === 0 ||
                data.messages[idx - 1].member.platformUserId !==
                  msg.member.platformUserId;
              const hasNegativeSignal =
                msg.signal && msg.signal.sentiment < -0.3;

              // Show nudge sent marker between messages if applicable
              const nudgeSentAfterPrev = data.interventions.find((i) => {
                const prevSentAt = idx > 0
                  ? new Date(data.messages[idx - 1].sentAt).getTime()
                  : 0;
                const thisSentAt = new Date(msg.sentAt).getTime();
                const interventionAt = i.sentAt
                  ? new Date(i.sentAt).getTime()
                  : 0;
                return (
                  i.status === "SENT" &&
                  interventionAt > prevSentAt &&
                  interventionAt <= thisSentAt
                );
              });

              return (
                <div key={msg.id}>
                  {/* Nudge sent marker */}
                  {nudgeSentAfterPrev && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-green-200" />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                        <Sparkles size={12} />
                        Nudge sent — private message delivered
                      </div>
                      <div className="flex-1 h-px bg-green-200" />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <div className="w-10 shrink-0">
                      {showHeader && (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      {showHeader && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-slate-900 text-sm">
                            {msg.member.displayName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(msg.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}

                      <div
                        className={`text-sm text-slate-700 leading-relaxed max-w-2xl ${
                          msg.rawText ? "" : "italic text-slate-400"
                        }`}
                      >
                        {msg.rawText ?? "[Message purged — retention policy]"}
                      </div>

                      {/* Signal badges */}
                      {msg.signal && (hasNegativeSignal || msg.signal.interruption) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.signal.sentiment < -0.3 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                              <AlertCircle size={11} />
                              Sentiment {msg.signal.sentiment.toFixed(2)}
                            </span>
                          )}
                          {msg.signal.interruption && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                              <AlertCircle size={11} />
                              Interruption
                            </span>
                          )}
                          {msg.signal.emotion && msg.signal.emotion !== "neutral" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {msg.signal.emotion}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Analysis Panel ── */}
      <div className="w-full md:w-80 shrink-0 bg-slate-50 flex flex-col h-full overflow-y-auto border-l border-slate-200">
        <div className="p-6 space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Analysis & Prediction
          </h3>

          {/* Current tension */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Current Tension
            </div>
            {latestTension ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {Math.round(latestTension.tensionScore * 100)}%
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                        latestTension.riskLevel === "CRITICAL"
                          ? "bg-red-600 text-white"
                          : latestTension.riskLevel === "HIGH"
                          ? "bg-orange-500 text-white"
                          : latestTension.riskLevel === "MEDIUM"
                          ? "bg-amber-400 text-white"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {latestTension.riskLevel ?? "LOW"}
                    </span>
                    <TrendIndicator trend={latestTension.trend} />
                  </div>
                </div>
                {latestTension.signalLabels?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Why:
                    </p>
                    <ul className="space-y-1">
                      {latestTension.signalLabels.map((label, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5">•</span>
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500 italic">
                No prediction available yet.
              </div>
            )}
          </div>

          {/* Mediation / nudge panel */}
          {hasMediationSuggestion && (
            <div className="bg-indigo-50/60 p-5 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-3">
                <Sparkles size={16} className="text-indigo-500" />
                Recommended Action
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 text-sm text-slate-700 italic leading-relaxed mb-4">
                &ldquo;{latestTension!.mediationSuggestion}&rdquo;
              </div>

              {/* Send nudge button */}
              {!alreadySentNudge ? (
                <>
                  <button
                    onClick={handleSendNudge}
                    disabled={isSendingNudge}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    {isSendingNudge ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Send Private Nudge
                      </>
                    )}
                  </button>
                  {nudgeError && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      ⚠ {nudgeError}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                  <CheckCircle size={16} />
                  Nudge delivered
                </div>
              )}
            </div>
          )}

          {/* Interventions history */}
          {data.interventions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Interventions
              </div>
              <div className="space-y-2">
                {data.interventions.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="bg-white p-3 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-600">
                        Private nudge
                      </span>
                      <InterventionBadge intervention={intervention} />
                    </div>
                    <p className="text-slate-500 text-xs truncate mb-1 italic">
                      &ldquo;{intervention.message.slice(0, 60)}…&rdquo;
                    </p>
                    {intervention.sentAt && (
                      <span className="text-slate-400">
                        {new Date(intervention.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {intervention.errorMessage && (
                      <p className="text-red-500 mt-1 text-xs">
                        ⚠ {intervention.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tension timeline */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Tension Timeline
            </div>
            {data.tensionHistory.length > 0 ? (
              <div className="relative pl-3 border-l-2 border-slate-200 space-y-4">
                {data.tensionHistory.map((snap) => {
                  const dotColor =
                    snap.riskLevel === "CRITICAL"
                      ? "bg-red-500"
                      : snap.riskLevel === "HIGH"
                      ? "bg-orange-400"
                      : snap.riskLevel === "MEDIUM"
                      ? "bg-amber-400"
                      : "bg-green-400";

                  return (
                    <div key={snap.id} className="relative">
                      <div
                        className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-white ${dotColor}`}
                      />
                      <div className="text-xs text-slate-500 font-medium mb-1">
                        {new Date(snap.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <TensionScore
                          score={snap.tensionScore}
                          signalsFired={snap.signalLabels ?? snap.signalsFired}
                          size="sm"
                        />
                        <TrendIndicator trend={snap.trend} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">
                No history recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
