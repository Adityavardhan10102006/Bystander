"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, User, MessageCircle, AlertCircle, Sparkles } from "lucide-react";
import { TensionScore, LoadingState, ErrorState, EmptyState } from "../../../components/ui";

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
    emotion: string;
    interruption: boolean;
  } | null;
}

interface TensionSnapshot {
  id: string;
  tensionScore: number;
  trend: number;
  signalsFired: string[];
  createdAt: string;
}

interface ThreadDetail {
  id: string;
  externalId: string;
  platform: string;
  status: string;
  team: { name: string };
  messages: Message[];
  tensionHistory: TensionSnapshot[];
}

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/conversations/${params.id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch conversation: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data]);

  if (isLoading) return <LoadingState message="Loading conversation details..." />;
  if (error) return <ErrorState error={error} retry={() => window.location.reload()} />;
  if (!data) return null;

  const latestTension = data.tensionHistory[0];

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-50 relative">
      {/* ── Main Chat Stream ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {data.platform} Thread: {data.externalId}
              </h2>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <span className={data.status === "ACTIVE" ? "text-green-600" : "text-slate-500"}>
                  {data.status}
                </span>
                <span>·</span>
                <span>{data.messages.length} messages</span>
              </div>
            </div>
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {data.messages.length === 0 ? (
            <EmptyState title="No messages found" description="Raw text may have been purged." icon={MessageCircle} />
          ) : (
            data.messages.map((msg, idx) => {
              const showHeader = idx === 0 || data.messages[idx - 1].member.platformUserId !== msg.member.platformUserId;
              const hasNegativeSignal = msg.signal && msg.signal.sentiment < -0.3;

              return (
                <div key={msg.id} className="flex gap-4">
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
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    
                    <div className={`text-sm text-slate-700 leading-relaxed max-w-2xl ${msg.rawText ? '' : 'italic text-slate-400'}`}>
                      {msg.rawText || "[Message purged due to retention policy]"}
                    </div>

                    {/* NLP Signal Badges below message */}
                    {msg.signal && (hasNegativeSignal || msg.signal.interruption) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.signal.sentiment < -0.3 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                            <AlertCircle size={12} /> Negative Sentiment ({(msg.signal.sentiment).toFixed(2)})
                          </span>
                        )}
                        {msg.signal.interruption && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                            <AlertCircle size={12} /> Interruption
                          </span>
                        )}
                        {msg.signal.emotion && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {msg.signal.emotion}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Context / Tension Panel ── */}
      <div className="w-full md:w-80 shrink-0 bg-slate-50 flex flex-col h-full overflow-y-auto border-l border-slate-200">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-6">
            Analysis & Prediction
          </h3>

          {/* Tension Score Widget */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Current Tension
            </div>
            {latestTension ? (
              <TensionScore score={latestTension.tensionScore} signalsFired={latestTension.signalsFired} size="lg" />
            ) : (
              <div className="text-sm text-slate-500 italic">No prediction available yet.</div>
            )}
          </div>

          {/* Mediation Suggestions (Mocked for UI as per schema missing relations) */}
          {latestTension && latestTension.tensionScore > 0.4 && (
            <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 mb-6">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-3">
                <Sparkles size={18} className="text-indigo-500" />
                Mediation Generated
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                A private nudge was delivered suggesting a <strong>15-minute cooling off period</strong> based on the tone shift and rapid replies.
              </p>
              <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-slate-600 italic">
                "Hey there, this discussion seems to be heating up quickly. Consider taking a short break before responding to keep things constructive."
              </div>
            </div>
          )}

          {/* History Timeline */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Prediction History
            </div>
            {data.tensionHistory.length > 0 ? (
              <div className="relative pl-3 border-l-2 border-slate-200 space-y-6">
                {data.tensionHistory.map((snap) => (
                  <div key={snap.id} className="relative">
                    <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-white bg-slate-300" />
                    <div className="text-xs text-slate-500 font-medium mb-1">
                      {new Date(snap.createdAt).toLocaleString()}
                    </div>
                    <TensionScore score={snap.tensionScore} signalsFired={snap.signalsFired} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">No history recorded.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
