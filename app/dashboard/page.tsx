"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../components/AuthProvider";
import { TensionScore, LoadingState, ErrorState, EmptyState } from "../components/ui";
import { Activity, MessageSquare, AlertTriangle, ChevronRight } from "lucide-react";

// The types matching the Prisma schema expected from the API
interface TensionSnapshot {
  id: string;
  tensionScore: number;
  trend: number;
  confidence: number;
  signalsFired: string[];
  createdAt: string;
}

interface Thread {
  id: string;
  externalId: string;
  platform: string;
  status: string;
  tensionHistory: TensionSnapshot[];
}

interface DashboardData {
  teamId: string;
  threads: Thread[];
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.teamId) {
      setError(new Error("No team ID found for user"));
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/dashboard?teamId=${user.teamId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard data: ${res.statusText}`);
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
  }, [user, isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return <LoadingState message="Loading team health data..." />;
  }

  if (error) {
    return <ErrorState error={error} retry={() => window.location.reload()} />;
  }

  if (!data) return null;

  // Compute some aggregated stats
  const activeThreads = data.threads.filter(t => t.status === "ACTIVE");
  const flaggedThreads = activeThreads.filter(t => {
    const latest = t.tensionHistory[0];
    return latest && latest.tensionScore >= 0.4;
  });
  
  // Calculate average tension across all active threads
  let avgTension = 0;
  if (activeThreads.length > 0) {
    const sum = activeThreads.reduce((acc, t) => {
      return acc + (t.tensionHistory[0]?.tensionScore || 0);
    }, 0);
    avgTension = sum / activeThreads.length;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Health Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring active discussions for rising tension across {data.threads.length} total threads.
          </p>
        </header>

        {/* Global Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Average Tension</div>
              <TensionScore score={avgTension} showSignals={false} size="lg" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Active Threads</div>
              <div className="text-2xl font-bold text-slate-900">{activeThreads.length}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">Flagged / Elevated</div>
              <div className="text-2xl font-bold text-slate-900">{flaggedThreads.length}</div>
            </div>
          </div>
        </div>

        {/* Recent Flagged Conversations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Flagged Conversations</h2>
            <Link href="/dashboard/conversations" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
              View all
            </Link>
          </div>

          {flaggedThreads.length === 0 ? (
            <EmptyState 
              title="All clear" 
              description="No active conversations are currently showing elevated tension levels. Good job team!"
              icon={CheckCircle}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {flaggedThreads.map((thread) => {
                const latestSnapshot = thread.tensionHistory[0];
                if (!latestSnapshot) return null;

                return (
                  <Link
                    key={thread.id}
                    href={`/dashboard/conversations/${thread.id}`}
                    className="block bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                            {thread.platform}
                          </span>
                          <span className="text-sm text-slate-400 font-medium">
                            Thread: {thread.externalId}
                          </span>
                        </div>
                        
                        {/* Explainability section: Always show signals that led to this score */}
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                            Signals Fired
                          </p>
                          <TensionScore 
                            score={latestSnapshot.tensionScore} 
                            signalsFired={latestSnapshot.signalsFired} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
                        View Details <ChevronRight size={16} className="ml-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Needed to import this for EmptyState if CheckCircle is used
import { CheckCircle } from "lucide-react";
