"use client";
// Landing / Marketing page
// Clean, premium SaaS aesthetic — light theme to match the chat UI

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f7" }}>
      {/* ── Nav ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "#4f6ef7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "-0.02em",
            }}
          >
            B
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827", letterSpacing: "-0.02em" }}>
            Bystander
          </span>
        </div>

        {/* Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["Features", "How it works", "Pricing", "Docs"].map((item) => (
            <a
              key={item}
              href="#"
              style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", transition: "color 150ms ease" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6b7280")}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
          <a
            href="/dashboard"
            style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6b7280")}
          >
            Sign in
          </a>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#4f6ef7",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#3b5beb")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "#4f6ef7")}
          >
            Open Dashboard →
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: "96px 32px 80px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
        {/* Pill badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            background: "rgba(79,110,247,0.08)",
            border: "1px solid rgba(79,110,247,0.20)",
            borderRadius: 9999,
            color: "#4f6ef7",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 28,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f6ef7", display: "inline-block" }} />
          Now monitoring Discord workspaces
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            color: "#111827",
            marginBottom: 24,
          }}
        >
          Detect team tension{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #4f6ef7, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            before it escalates
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#6b7280",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 40px",
          }}
        >
          Bystander monitors team chat, scores rising friction, and privately nudges
          people with de-escalation suggestions — before conflict becomes visible.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 12,
              background: "#4f6ef7",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(79,110,247,0.30)",
              transition: "all 150ms ease",
            }}
          >
            View Live Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <a
            href="#"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 24px",
              borderRadius: 12,
              background: "white",
              color: "#374151",
              fontSize: 15,
              fontWeight: 500,
              border: "1px solid #e5e7eb",
              transition: "all 150ms ease",
            }}
          >
            Read Documentation
          </a>
        </div>

        {/* Trust line */}
        <p style={{ marginTop: 32, fontSize: 13, color: "#9ca3af" }}>
          Discord integration · Private nudges only · GDPR-aware retention
        </p>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "white", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: "80px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em", marginBottom: 12 }}>
              How Bystander works
            </h2>
            <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 480, margin: "0 auto" }}>
              A fully automatic pipeline from message to private nudge — in seconds.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {[
              {
                step: "01",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ),
                color: "#4f6ef7",
                bg: "rgba(79,110,247,0.08)",
                title: "Discord Ingestion",
                desc: "Messages arrive via webhook and are normalized into a platform-agnostic format without storing raw text long-term.",
              },
              {
                step: "02",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
                ),
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.08)",
                title: "NLP Analysis",
                desc: "Anthropic AI scores sentiment, detects emotion, and builds a signal profile — reply gaps, interruptions, tone shifts.",
              },
              {
                step: "03",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                ),
                color: "#ef4444",
                bg: "rgba(239,68,68,0.08)",
                title: "Conflict Prediction",
                desc: "A tension score (0–1) is computed with explainability — every prediction ships signalsFired, never a black-box number.",
              },
              {
                step: "04",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                ),
                color: "#22c55e",
                bg: "rgba(34,197,94,0.08)",
                title: "Private Nudge",
                desc: "When tension crosses threshold, a private DM goes to the person with a non-judgmental suggestion or rewrite — never in the public channel.",
              },
            ].map((f) => (
              <div
                key={f.step}
                style={{
                  padding: "28px 24px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  transition: "box-shadow 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                  el.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.boxShadow = "none";
                  el.style.borderColor = "#e5e7eb";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: f.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: f.color,
                    marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.06em", marginBottom: 8 }}>
                  STEP {f.step}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 10, letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Retention callout ── */}
      <section style={{ padding: "80px 32px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            padding: "40px 48px",
            borderRadius: 18,
            background: "white",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(79,110,247,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f6ef7",
              margin: "0 auto 20px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Privacy by design
          </h3>
          <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
            Raw message text is retained only for the duration of the active conversation thread.
            Once a thread is closed or archived, text is purged automatically.
            Long-term trend data uses only derived signals — tension scores, sentiment, signals fired.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {["Automatic purge", "No indefinite storage", "signalsFired explainability"].map((t) => (
              <span
                key={t}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid #e5e7eb",
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#4f6ef7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            B
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Bystander</span>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          © 2026 Bystander Inc. AI-powered conflict mediation.
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "GitHub"].map((l) => (
            <a key={l} href="#" style={{ fontSize: 13, color: "#9ca3af", transition: "color 150ms ease" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#374151")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#9ca3af")}
            >
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
