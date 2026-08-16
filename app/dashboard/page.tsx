"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { TensionScore, LoadingState, ErrorState, EmptyState } from "../components/ui";
import { Activity, MessageSquare, AlertTriangle, ChevronRight, Shield, Zap, CheckCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Team {
  id: string;
  name: string;
  platform: string;
  discordGuildId: string | null;
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

interface ThreadInterventions {
  sent: number;
  failed: number;
}

interface Thread {
  id: string;
  externalId: string;
  platform: string;
  status: string;
  tensionHistory: TensionSnapshot[];
  interventions: ThreadInterventions;
  _isDemoThread?: boolean;
}

interface DashboardData {
  teamId: string;
  threads: Thread[];
  isDemoMode: boolean;
  summary?: {
    activeThreads: number;
    flaggedThreads: number;
    averageTension: number;
    interventionsSent: number;
    recoveredThreads: number;
  };
}

// ---------------------------------------------------------------------------
// Trend indicator component
// ---------------------------------------------------------------------------

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
        <TrendingUp size={14} /> Rising
      </span>
    );
  }
  if (trend < -0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
        <TrendingDown size={14} /> Falling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-semibold">
      <Minus size={14} /> Stable
    </span>
  );
}

// ---------------------------------------------------------------------------
// Team selector
// ---------------------------------------------------------------------------

function TeamSelector({
  teams,
  selectedId,
  onSelect,
}: {
  teams: Team[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm font-medium text-slate-500">Team:</span>
      <div className="flex gap-2 flex-wrap">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => onSelect(team.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              selectedId === team.id
                ? "bg-accent text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {team.name.replace(/^discord(?:-guild|-channel)?:/, "")}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    searchParams.get("teamId")
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ── Fetch teams on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading || !user) return;

    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`Failed to load teams: ${res.statusText}`);
        }
        const json = (await res.json()) as { teams: Team[] };
        setTeams(json.teams);

        // Auto-select first team if none selected
        if (!selectedTeamId && json.teams.length > 0) {
          setSelectedTeamId(json.teams[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [user, isAuthLoading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync selected team to URL ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTeamId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("teamId", selectedTeamId);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch dashboard data when team changes ────────────────────────────────
  const fetchDashboard = useCallback(async (teamId: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?teamId=${teamId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard data: ${res.statusText}`);
      }
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    fetchDashboard(selectedTeamId);
  }, [selectedTeamId, fetchDashboard]);

  // ── SSE connection for realtime updates ───────────────────────────────────
  useEffect(() => {
    if (!selectedTeamId) return;

    const eventSource = new EventSource(
      `/api/realtime/stream?teamId=${selectedTeamId}`
    );

    eventSource.addEventListener("update", () => {
      // Refresh dashboard data on any update event
      fetchDashboard(selectedTeamId);
    });

    eventSource.addEventListener("error", () => {
      // SSE connection error — will auto-reconnect
    });

    return () => {
      eventSource.close();
    };
  }, [selectedTeamId, fetchDashboard]);

  // ── Render states ─────────────────────────────────────────────────────────

  if (isAuthLoading || isLoadingTeams) {
    return <LoadingState message="Loading workspace..." />;
  }

  if (error) {
    return <ErrorState error={error} retry={() => window.location.reload()} />;
  }

  // No teams — show onboarding prompt
  if (teams.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div className="max-w-md mx-auto mt-16">
          <EmptyState
            title="No teams found"
            description="You don't have access to any teams yet. Connect a Discord server or ask an admin to grant you access."
            icon={Shield}
          />
          <div className="text-center mt-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              <Zap size={16} />
              Connect a Discord Server
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Team Health Overview
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {data
                  ? `Monitoring ${data.threads.length} threads`
                  : "Select a team to view data"}
              </p>
            </div>
            {data?.isDemoMode && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-amber-200">
                <Zap size={12} />
                Demo Mode
              </span>
            )}
          </div>
        </header>

        {/* Team selector */}
        {teams.length > 1 && (
          <TeamSelector
            teams={teams}
            selectedId={selectedTeamId}
            onSelect={setSelectedTeamId}
          />
        )}

        {isLoadingData ? (
          <LoadingState message="Loading team health data..." />
        ) : !data ? null : (
          <>
            {/* Stats row */}
            <DashboardStats data={data} />

            {/* Flagged conversations */}
            <FlaggedConversations data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats row component
// ---------------------------------------------------------------------------

function DashboardStats({ data }: { data: DashboardData }) {
  const activeThreads = data.threads.filter((t) => t.status === "ACTIVE");
  const flaggedThreads = activeThreads.filter((t) => {
    const latest = t.tensionHistory[0];
    return latest && latest.tensionScore >= 0.3;
  });
  const risingThreads = activeThreads.filter((t) => {
    const latest = t.tensionHistory[0];
    return latest && latest.trend > 0.05;
  });
  const totalInterventionsSent = data.threads.reduce(
    (acc, t) => acc + (t.interventions?.sent ?? 0),
    0
  );

  let avgTension = 0;
  if (activeThreads.length > 0) {
    const sum = activeThreads.reduce(
      (acc, t) => acc + (t.tensionHistory[0]?.tensionScore ?? 0),
      0
    );
    avgTension = sum / activeThreads.length;
  }

  const stats = [
    {
      label: "Average Tension",
      value: (
        <TensionScore score={avgTension} showSignals={false} size="lg" />
      ),
      icon: <Activity size={24} />,
      bg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active Threads",
      value: <span className="text-2xl font-bold text-slate-900">{activeThreads.length}</span>,
      icon: <MessageSquare size={24} />,
      bg: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Elevated / Flagged",
      value: <span className="text-2xl font-bold text-slate-900">{flaggedThreads.length}</span>,
      icon: <AlertTriangle size={24} />,
      bg: "bg-amber-50 text-amber-500",
    },
    {
      label: "Rising Conflicts",
      value: <span className="text-2xl font-bold text-red-600">{risingThreads.length}</span>,
      icon: <TrendingUp size={24} />,
      bg: "bg-red-50 text-red-500",
    },
    {
      label: "Nudges Sent",
      value: <span className="text-2xl font-bold text-slate-900">{totalInterventionsSent}</span>,
      icon: <CheckCircle size={24} />,
      bg: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
            {stat.icon}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">{stat.label}</div>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flagged conversations list
// ---------------------------------------------------------------------------

function FlaggedConversations({ data }: { data: DashboardData }) {
  const flaggedThreads = data.threads
    .filter((t) => {
      const latest = t.tensionHistory[0];
      return latest && latest.tensionScore >= 0.3;
    })
    .sort((a, b) => {
      const aScore = a.tensionHistory[0]?.tensionScore ?? 0;
      const bScore = b.tensionHistory[0]?.tensionScore ?? 0;
      return bScore - aScore;
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Flagged Conversations
        </h2>
        <Link
          href="/dashboard/conversations"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          View all
        </Link>
      </div>

      {flaggedThreads.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No active conversations are showing elevated tension. Great job team!"
          icon={CheckCircle}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {flaggedThreads.map((thread) => {
            const latestSnapshot = thread.tensionHistory[0];
            if (!latestSnapshot) return null;

            const riskLevel = latestSnapshot.riskLevel ?? "LOW";
            const riskColors: Record<string, string> = {
              CRITICAL: "border-red-400 bg-red-50/50",
              HIGH: "border-orange-400 bg-orange-50/50",
              MEDIUM: "border-amber-400 bg-amber-50/50",
              LOW: "border-slate-200 bg-white",
            };

            return (
              <Link
                key={thread.id}
                href={`/dashboard/conversations/${thread.id}`}
                className={`block p-5 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all group ${riskColors[riskLevel] ?? "border-slate-200 bg-white"}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                          riskLevel === "CRITICAL"
                            ? "bg-red-600 text-white"
                            : riskLevel === "HIGH"
                            ? "bg-orange-500 text-white"
                            : riskLevel === "MEDIUM"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {riskLevel}
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {Math.round(latestSnapshot.tensionScore * 100)}%
                      </span>
                      <TrendIndicator trend={latestSnapshot.trend} />
                      {thread.interventions?.sent > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                          <CheckCircle size={11} />
                          {thread.interventions.sent} nudge{thread.interventions.sent !== 1 ? "s" : ""} sent
                        </span>
                      )}
                    </div>

                    {/* Platform + channel info */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold uppercase">
                        {thread.platform}
                      </span>
                      <span className="font-mono text-xs">#{thread.externalId}</span>
                      {thread._isDemoThread && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-xs font-semibold">
                          DEMO
                        </span>
                      )}
                    </div>

                    {/* Signals */}
                    {(latestSnapshot.signalLabels ?? latestSnapshot.signalsFired).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                          Why detected:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(latestSnapshot.signalLabels ?? latestSnapshot.signalsFired)
                            .slice(0, 4)
                            .map((label, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200"
                              >
                                • {label}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center text-accent font-medium text-sm group-hover:translate-x-1 transition-transform shrink-0">
                    View Details <ChevronRight size={16} className="ml-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
