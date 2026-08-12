"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // TODO: Connect this to the actual Discord OAuth/Ingestion setup backend.
    // Currently stubs a 2-second connection simulation.
    setTimeout(() => {
      setIsConnecting(false);
      setStep(2);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-16 flex items-center px-8 bg-white border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {step === 1 ? (
            <div className="p-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Connect Discord</h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Add the Bystander bot to your Discord workspace. It requires read access to messages to monitor tension, and permission to send direct messages for private nudges.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Read message history",
                  "Send direct messages",
                  "No raw text stored indefinitely",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 size={16} className="text-green-500" /> {item}
                  </div>
                ))}
              </div>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Zap size={18} className="animate-pulse" /> Connecting...
                  </>
                ) : (
                  "Authorize with Discord"
                )}
              </button>
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Connection Successful</h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Bystander is now monitoring your workspace. You can configure which channels to track from the dashboard settings.
              </p>
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-colors text-center inline-block"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
