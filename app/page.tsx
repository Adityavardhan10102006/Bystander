import Link from "next/link";
import { ArrowRight, MessageSquare, ShieldAlert, Zap, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 h-16 flex items-center px-8 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <span className="text-lg font-semibold text-slate-900 tracking-tight">
            Bystander
          </span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "How it works", "Pricing", "Docs"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            Connect Discord <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-24 pb-20 px-8 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Now monitoring Discord workspaces
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
          Detect team tension{" "}
          <span className="bg-gradient-to-br from-accent to-indigo-400 bg-clip-text text-transparent">
            before it escalates
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
          Bystander monitors team chat, scores rising friction, and privately nudges
          people with de-escalation suggestions — before conflict becomes visible.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-base font-semibold shadow-lg shadow-accent/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/40 transition-all"
          >
            Connect your Discord
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-slate-700 text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            View Live Dashboard
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-400 font-medium">
          Private nudges only · GDPR-aware retention · Explainable predictions
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white border-y border-slate-200 py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              How Bystander works
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              A fully automatic pipeline from message to private nudge — in seconds. Explainable at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: <MessageSquare size={24} />,
                color: "text-blue-600",
                bg: "bg-blue-50",
                title: "Discord Ingestion",
                desc: "Messages arrive via webhook and are normalized. Raw text is purged when threads close.",
              },
              {
                step: "02",
                icon: <Zap size={24} />,
                color: "text-amber-500",
                bg: "bg-amber-50",
                title: "NLP Analysis",
                desc: "Anthropic AI scores sentiment, detects emotion, and builds a signal profile instantly.",
              },
              {
                step: "03",
                icon: <ShieldAlert size={24} />,
                color: "text-red-500",
                bg: "bg-red-50",
                title: "Conflict Prediction",
                desc: "Tension score (0–1) is computed. Every prediction ships explicit signalsFired — no black boxes.",
              },
              {
                step: "04",
                icon: <Lock size={24} />,
                color: "text-green-600",
                bg: "bg-green-50",
                title: "Private Nudge",
                desc: "When tension crosses a threshold, a private DM offers de-escalation suggestions.",
              },
            ].map((f) => (
              <div
                key={f.step}
                className="p-8 rounded-2xl border border-slate-200 bg-white hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {f.icon}
                </div>
                <div className="text-xs font-bold text-slate-400 tracking-widest mb-2">
                  STEP {f.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 tracking-tight">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-8 flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto border-t border-slate-200 mt-12 gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <span className="text-sm font-semibold text-slate-700">Bystander</span>
        </div>
        <p className="text-sm text-slate-400">
          © 2026 Bystander Inc. AI-powered conflict mediation.
        </p>
        <div className="flex gap-6">
          {["Privacy", "Terms", "GitHub"].map((l) => (
            <Link key={l} href="#" className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
              {l}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
