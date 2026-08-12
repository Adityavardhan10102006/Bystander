"use client";
// Bystander — Team Health Dashboard
// Redesigned as a premium 4-column chat workspace UI
// matching the Dribbble reference #23863847

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────
type TensionLevel = "low" | "medium" | "high";

interface Thread {
  id: string;
  name: string;
  platform: string;
  participants: number;
  lastMessage: string;
  lastTime: string;
  tensionScore: number;
  trend: number;
  level: TensionLevel;
  unread: boolean;
  status: "ACTIVE" | "CLOSED";
  signals: string[];
  avatarColor: string;
  initials: string;
}

interface Message {
  id: string;
  sender: string;
  initials: string;
  avatarColor: string;
  text: string;
  time: string;
  type: "in" | "out";
  signal?: TensionLevel;
}

// ── Mock Data ──────────────────────────────────────────────
const THREADS: Thread[] = [
  {
    id: "1",
    name: "API Gateway Refactor",
    platform: "Discord · #engineering",
    participants: 3,
    lastMessage: "This is the third time I've had to explain this.",
    lastTime: "2m ago",
    tensionScore: 0.85,
    trend: 0.12,
    level: "high",
    unread: true,
    status: "ACTIVE",
    signals: ["3 unanswered questions", "Tone shift detected", "Rapid replies"],
    avatarColor: "#ef4444",
    initials: "AG",
  },
  {
    id: "2",
    name: "Q3 Planning",
    platform: "Discord · #leadership",
    participants: 5,
    lastMessage: "Looking good — approved the roadmap.",
    lastTime: "15m ago",
    tensionScore: 0.15,
    trend: -0.04,
    level: "low",
    unread: false,
    status: "ACTIVE",
    signals: [],
    avatarColor: "#22c55e",
    initials: "Q3",
  },
  {
    id: "3",
    name: "Design Review",
    platform: "Discord · #design",
    participants: 4,
    lastMessage: "Can we revisit the component library decision?",
    lastTime: "42m ago",
    tensionScore: 0.47,
    trend: 0.08,
    level: "medium",
    unread: true,
    status: "ACTIVE",
    signals: ["Repeated topic", "Reply delay 8m"],
    avatarColor: "#f59e0b",
    initials: "DR",
  },
  {
    id: "4",
    name: "Deployment Incident",
    platform: "Discord · #ops",
    participants: 6,
    lastMessage: "Who pushed to prod without review?",
    lastTime: "1h ago",
    tensionScore: 0.72,
    trend: 0.21,
    level: "high",
    unread: false,
    status: "ACTIVE",
    signals: ["Interruption pattern", "Negative sentiment", "Tone shift detected"],
    avatarColor: "#8b5cf6",
    initials: "DI",
  },
  {
    id: "5",
    name: "Onboarding — Sarah",
    platform: "Discord · #general",
    participants: 2,
    lastMessage: "Welcome! Let me know if you need anything.",
    lastTime: "3h ago",
    tensionScore: 0.05,
    trend: 0,
    level: "low",
    unread: false,
    status: "ACTIVE",
    signals: [],
    avatarColor: "#4f6ef7",
    initials: "ON",
  },
  {
    id: "6",
    name: "Budget Discussion",
    platform: "Discord · #leadership",
    participants: 3,
    lastMessage: "We need to cut scope — there's no other option.",
    lastTime: "5h ago",
    tensionScore: 0.58,
    trend: 0.05,
    level: "medium",
    unread: false,
    status: "CLOSED",
    signals: ["Directive language", "Short replies"],
    avatarColor: "#6b7280",
    initials: "BD",
  },
];

const MESSAGES: Record<string, Message[]> = {
  "1": [
    {
      id: "m1",
      sender: "Jordan M.",
      initials: "JM",
      avatarColor: "#4f6ef7",
      text: "Hey, I pushed the new gateway config — can someone review the PR?",
      time: "10:15 AM",
      type: "in",
    },
    {
      id: "m2",
      sender: "Alex K.",
      initials: "AK",
      avatarColor: "#ef4444",
      text: "We talked about this last week. The config approach was decided already.",
      time: "10:22 AM",
      type: "in",
      signal: "medium",
    },
    {
      id: "m3",
      sender: "You",
      initials: "ME",
      avatarColor: "#4f6ef7",
      text: "I know, I just made a small change to the timeout values. It shouldn't be a big deal.",
      time: "10:24 AM",
      type: "out",
    },
    {
      id: "m4",
      sender: "Alex K.",
      initials: "AK",
      avatarColor: "#ef4444",
      text: "This is the third time I've had to explain this. We don't change prod configs without a proper RFC.",
      time: "10:31 AM",
      type: "in",
      signal: "high",
    },
    {
      id: "m5",
      sender: "Alex K.",
      initials: "AK",
      avatarColor: "#ef4444",
      text: "Please revert it.",
      time: "10:31 AM",
      type: "in",
    },
  ],
  "2": [
    {
      id: "m1",
      sender: "Manager",
      initials: "PM",
      avatarColor: "#22c55e",
      text: "Everyone reviewed the Q3 roadmap. Any blockers?",
      time: "9:00 AM",
      type: "in",
    },
    {
      id: "m2",
      sender: "You",
      initials: "ME",
      avatarColor: "#4f6ef7",
      text: "Looks good from my end. The timeline is realistic.",
      time: "9:05 AM",
      type: "out",
    },
    {
      id: "m3",
      sender: "Manager",
      initials: "PM",
      avatarColor: "#22c55e",
      text: "Looking good — approved the roadmap.",
      time: "9:10 AM",
      type: "in",
    },
  ],
};

// ── Sub-components ─────────────────────────────────────────

function AvatarCircle({
  initials,
  color,
  size = 36,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}22`,
        border: `1.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size < 36 ? 10 : 12,
        fontWeight: 700,
        color: color,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

function TensionChip({ level, score }: { level: TensionLevel; score: number }) {
  const map = {
    low:    { bg: "rgba(34,197,94,0.10)",  color: "#16a34a", label: "Low" },
    medium: { bg: "rgba(245,158,11,0.10)", color: "#d97706", label: "Med" },
    high:   { bg: "rgba(239,68,68,0.10)",  color: "#dc2626", label: "High" },
  };
  const s = map[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 9999,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {score.toFixed(2)}
    </span>
  );
}

function SignalTag({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 9999,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        color: "#374151",
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// Icon components (inline SVG)
const Icons = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Inbox: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Star: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Archive: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Phone: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  MoreH: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Paperclip: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  Smile: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  TrendUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  TrendDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Discord: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.09.12 18.12.149 18.14a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ── Nav items config ───────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",     Icon: Icons.Home,     label: "Home" },
  { id: "inbox",    Icon: Icons.Inbox,    label: "Inbox",    badge: true },
  { id: "activity", Icon: Icons.Activity, label: "Activity" },
  { id: "teams",    Icon: Icons.Users,    label: "Teams" },
  { id: "star",     Icon: Icons.Star,     label: "Starred" },
  { id: "archive",  Icon: Icons.Archive,  label: "Archived" },
];

// ── Main Dashboard Page ────────────────────────────────────
export default function DashboardPage() {
  const [activeNavItem, setActiveNavItem] = useState("inbox");
  const [selectedThread, setSelectedThread] = useState<Thread>(THREADS[0]);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [composerText, setComposerText] = useState("");
  const [detailOpen, setDetailOpen] = useState(true);
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);

  const filtered = THREADS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      filterTab === "all" ||
      (filterTab === "active" && t.status === "ACTIVE") ||
      (filterTab === "closed" && t.status === "CLOSED");
    return matchesSearch && matchesTab;
  });

  const messages = MESSAGES[selectedThread.id] || [];
  const avgTension = THREADS.filter(t => t.status === "ACTIVE").reduce((a, t) => a + t.tensionScore, 0) / THREADS.filter(t => t.status === "ACTIVE").length;
  const activeCount = THREADS.filter(t => t.status === "ACTIVE").length;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#f0f2f7",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ═══════════════════════════════════════════════════
          LEFT: Icon Navigation Bar (slim dark rail)
      ═══════════════════════════════════════════════════ */}
      <nav
        style={{
          width: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0",
          background: "#1e2128",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "#4f6ef7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.02em",
            marginBottom: 20,
            flexShrink: 0,
          }}
        >
          B
        </div>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(({ id, Icon, label, badge }) => (
            <button
              key={id}
              title={label}
              aria-label={label}
              onClick={() => setActiveNavItem(id)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                transition: "all 150ms ease",
                background: activeNavItem === id ? "rgba(79,110,247,0.20)" : "transparent",
                color: activeNavItem === id ? "#4f6ef7" : "rgba(255,255,255,0.40)",
              }}
              onMouseEnter={(e) => {
                if (activeNavItem !== id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeNavItem !== id) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.40)";
                }
              }}
            >
              <Icon />
              {badge && (
                <span
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "1.5px solid #1e2128",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Bottom items */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 12 }}>
          <button
            aria-label="Settings"
            title="Settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "rgba(255,255,255,0.35)",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.80)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
            }}
          >
            <Icons.Settings />
          </button>
          {/* User avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#4f6ef7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: "2px solid rgba(255,255,255,0.12)",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.35)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)")}
            title="Your profile"
          >
            TL
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════
          SECOND COL: Conversation / Thread List
      ═══════════════════════════════════════════════════ */}
      <div
        style={{
          width: 300,
          display: "flex",
          flexDirection: "column",
          background: "white",
          borderRight: "1px solid #e5e7eb",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>Threads</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>Team Health · {activeCount} active</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                aria-label="Filter"
                title="Filter"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.currentTarget as HTMLButtonElement).style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
                }}
              >
                <Icons.Filter />
              </button>
              <button
                aria-label="New thread"
                title="New thread"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "#edf0ff",
                  color: "#4f6ef7",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#dde3ff")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#edf0ff")}
              >
                <Icons.Plus />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{ position: "absolute", left: 10, color: "#9ca3af", pointerEvents: "none" }}>
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search threads…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 9999,
                border: "1px solid transparent",
                background: "#f3f4f6",
                color: "#111827",
                fontSize: 13,
                outline: "none",
                transition: "all 150ms ease",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.background = "white";
                (e.target as HTMLInputElement).style.border = "1px solid #4f6ef7";
                (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(79,110,247,0.12)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.background = "#f3f4f6";
                (e.target as HTMLInputElement).style.border = "1px solid transparent";
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 16px", borderBottom: "1px solid #f3f4f6" }}>
          {(["all", "active", "closed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                padding: "4px 12px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: filterTab === tab ? 600 : 500,
                background: filterTab === tab ? "rgba(79,110,247,0.10)" : "transparent",
                color: filterTab === tab ? "#4f6ef7" : "#6b7280",
                transition: "all 150ms ease",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              No threads found
            </div>
          ) : (
            filtered.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                onMouseEnter={() => setHoveredThread(thread.id)}
                onMouseLeave={() => setHoveredThread(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  cursor: "pointer",
                  transition: "background 150ms ease",
                  background:
                    selectedThread.id === thread.id
                      ? "#edf0ff"
                      : hoveredThread === thread.id
                      ? "#f9fafb"
                      : "transparent",
                  position: "relative",
                }}
              >
                {/* Active thread indicator */}
                {selectedThread.id === thread.id && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 28,
                      borderRadius: "0 4px 4px 0",
                      background: "#4f6ef7",
                    }}
                  />
                )}

                <AvatarCircle initials={thread.initials} color={thread.avatarColor} size={38} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: thread.unread ? 700 : 500,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {thread.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: thread.unread ? "#4f6ef7" : "#9ca3af",
                        whiteSpace: "nowrap",
                        fontWeight: thread.unread ? 500 : 400,
                      }}
                    >
                      {thread.lastTime}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: thread.unread ? "#374151" : "#9ca3af",
                      fontWeight: thread.unread ? 500 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 4,
                    }}
                  >
                    {thread.lastMessage}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TensionChip level={thread.level} score={thread.tensionScore} />
                    {thread.unread && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#4f6ef7",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer stats */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Avg tension today
          </div>
          <TensionChip
            level={avgTension > 0.6 ? "high" : avgTension > 0.35 ? "medium" : "low"}
            score={avgTension}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          THIRD COL: Main Chat / Thread View
      ═══════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#f6f7fb",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Chat Header */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <AvatarCircle initials={selectedThread.initials} color={selectedThread.avatarColor} size={38} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>
              {selectedThread.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginTop: 1 }}>
              <span style={{ color: "#9ca3af" }}>
                <Icons.Discord />
              </span>
              <span>{selectedThread.platform}</span>
              <span>·</span>
              <span>{selectedThread.participants} participants</span>
              <span>·</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: selectedThread.status === "ACTIVE" ? "#16a34a" : "#9ca3af",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: selectedThread.status === "ACTIVE" ? "#22c55e" : "#9ca3af",
                  }}
                />
                {selectedThread.status === "ACTIVE" ? "Monitoring" : "Closed"}
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { icon: <Icons.Search />, label: "Search messages" },
              { icon: <Icons.Phone />, label: "Call" },
              { icon: <Icons.Video />, label: "Video" },
              { icon: <Icons.MoreH />, label: "More options" },
            ].map(({ icon, label }) => (
              <button
                key={label}
                aria-label={label}
                title={label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.currentTarget as HTMLButtonElement).style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
                }}
                onClick={() => {
                  if (label === "More options") setDetailOpen(!detailOpen);
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Date separator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0 16px",
              color: "#9ca3af",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            Today
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {/* Messages — group by sender */}
          {(() => {
            const groups: Message[][] = [];
            messages.forEach((msg) => {
              const last = groups[groups.length - 1];
              if (last && last[0].sender === msg.sender && last[0].type === msg.type) {
                last.push(msg);
              } else {
                groups.push([msg]);
              }
            });

            return groups.map((group, gi) => {
              const isOut = group[0].type === "out";
              return (
                <div
                  key={gi}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOut ? "flex-end" : "flex-start",
                    gap: 3,
                    marginBottom: 12,
                  }}
                >
                  {/* Group header (avatar + name + time) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexDirection: isOut ? "row-reverse" : "row",
                      marginBottom: 4,
                    }}
                  >
                    {!isOut && (
                      <AvatarCircle
                        initials={group[0].initials}
                        color={group[0].avatarColor}
                        size={28}
                      />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                      {isOut ? "You" : group[0].sender}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{group[0].time}</span>
                  </div>

                  {/* Bubbles */}
                  {group.map((msg, mi) => (
                    <div key={msg.id} style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: mi === 0 && mi === group.length - 1
                            ? 14
                            : mi === 0
                            ? isOut ? "14px 14px 4px 14px" : "14px 14px 14px 4px"
                            : mi === group.length - 1
                            ? isOut ? "4px 14px 14px 14px" : "4px 14px 14px 4px"  // fixed: was wrong
                            : isOut ? "4px 14px 14px 4px" : "4px 14px 14px 4px",
                          background: isOut ? "#4f6ef7" : "white",
                          color: isOut ? "white" : "#111827",
                          fontSize: 14,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          boxShadow: isOut ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                        }}
                      >
                        {msg.text}
                      </div>

                      {/* Signal tag below message */}
                      {msg.signal && !isOut && (
                        <div style={{ paddingLeft: 4 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "3px 8px",
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 500,
                              background:
                                msg.signal === "high"
                                  ? "rgba(239,68,68,0.10)"
                                  : msg.signal === "medium"
                                  ? "rgba(245,158,11,0.10)"
                                  : "rgba(34,197,94,0.10)",
                              color:
                                msg.signal === "high"
                                  ? "#dc2626"
                                  : msg.signal === "medium"
                                  ? "#d97706"
                                  : "#16a34a",
                            }}
                          >
                            {msg.signal === "high"
                              ? "⚠ High tension signal"
                              : msg.signal === "medium"
                              ? "↑ Rising tension"
                              : "● Low tension"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            });
          })()}

          {/* Active signals notice */}
          {selectedThread.signals.length > 0 && (
            <div
              style={{
                margin: "8px 0",
                padding: "12px 16px",
                borderRadius: 10,
                background:
                  selectedThread.level === "high"
                    ? "rgba(239,68,68,0.06)"
                    : selectedThread.level === "medium"
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(34,197,94,0.06)",
                border: `1px solid ${
                  selectedThread.level === "high"
                    ? "rgba(239,68,68,0.15)"
                    : selectedThread.level === "medium"
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(34,197,94,0.15)"
                }`,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 15 }}>
                {selectedThread.level === "high" ? "🚨" : selectedThread.level === "medium" ? "⚠️" : "✅"}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      selectedThread.level === "high" ? "#dc2626" : selectedThread.level === "medium" ? "#d97706" : "#16a34a",
                    marginBottom: 4,
                  }}
                >
                  Signals fired — tension score {selectedThread.tensionScore.toFixed(2)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedThread.signals.map((s) => (
                    <SignalTag key={s} text={s} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          style={{
            padding: "16px 24px",
            background: "white",
            borderTop: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 9999,
              padding: "8px 12px",
              transition: "border-color 150ms ease, box-shadow 150ms ease",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#4f6ef7";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(79,110,247,0.12)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            {/* Attach button */}
            <button
              aria-label="Attach file"
              title="Attach file"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#4f6ef7")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9ca3af")}
            >
              <Icons.Paperclip />
            </button>

            {/* Text input */}
            <textarea
              placeholder="Write a message…"
              rows={1}
              value={composerText}
              onChange={(e) => {
                setComposerText(e.target.value);
                (e.target as HTMLTextAreaElement).style.height = "auto";
                (e.target as HTMLTextAreaElement).style.height =
                  Math.min((e.target as HTMLTextAreaElement).scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setComposerText("");
                }
              }}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 14,
                color: "#111827",
                outline: "none",
                resize: "none",
                minHeight: 22,
                maxHeight: 120,
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />

            {/* Emoji */}
            <button
              aria-label="Emoji"
              title="Emoji"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#f59e0b")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9ca3af")}
            >
              <Icons.Smile />
            </button>

            {/* Send */}
            <button
              aria-label="Send message"
              disabled={!composerText.trim()}
              onClick={() => setComposerText("")}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                background: composerText.trim() ? "#4f6ef7" : "#f3f4f6",
                color: composerText.trim() ? "white" : "#9ca3af",
                cursor: composerText.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (composerText.trim())
                  (e.currentTarget as HTMLButtonElement).style.background = "#3b5beb";
              }}
              onMouseLeave={(e) => {
                if (composerText.trim())
                  (e.currentTarget as HTMLButtonElement).style.background = "#4f6ef7";
              }}
            >
              <Icons.Send />
            </button>
          </div>
          <div style={{ marginTop: 6, paddingLeft: 12, fontSize: 11, color: "#9ca3af" }}>
            ↵ Enter to send · Shift+↵ new line · Nudges are delivered privately via DM
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          FOURTH COL: Detail / Context Panel
      ═══════════════════════════════════════════════════ */}
      {detailOpen && (
        <div
          style={{
            width: 280,
            display: "flex",
            flexDirection: "column",
            background: "white",
            borderLeft: "1px solid #e5e7eb",
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Thread Details</span>
            <button
              aria-label="Close panel"
              onClick={() => setDetailOpen(false)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: "none",
                background: "transparent",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6";
                (e.currentTarget as HTMLButtonElement).style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
              }}
            >
              <Icons.X />
            </button>
          </div>

          {/* Thread profile */}
          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <AvatarCircle initials={selectedThread.initials} color={selectedThread.avatarColor} size={56} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{selectedThread.name}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{selectedThread.platform}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <TensionChip level={selectedThread.level} score={selectedThread.tensionScore} />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: "#f3f4f6",
                  color: "#374151",
                }}
              >
                {selectedThread.trend > 0 ? (
                  <><Icons.TrendUp /> +{selectedThread.trend.toFixed(2)}</>
                ) : (
                  <><Icons.TrendDown /> {selectedThread.trend.toFixed(2)}</>
                )}
              </span>
            </div>
          </div>

          {/* Tension bar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af" }}>
                Tension Score
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: selectedThread.level === "high" ? "#dc2626" : selectedThread.level === "medium" ? "#d97706" : "#16a34a" }}>
                {(selectedThread.tensionScore * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 9999, background: "#f3f4f6", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${selectedThread.tensionScore * 100}%`,
                  borderRadius: 9999,
                  background:
                    selectedThread.level === "high" ? "#ef4444" : selectedThread.level === "medium" ? "#f59e0b" : "#22c55e",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>Low</span>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>High</span>
            </div>
          </div>

          {/* Info rows */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 12 }}>
              Thread Info
            </div>
            {[
              { label: "Participants",  value: `${selectedThread.participants} members` },
              { label: "Platform",      value: "Discord" },
              { label: "Status",        value: selectedThread.status },
              { label: "Confidence",    value: "87%" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Signals fired */}
          {selectedThread.signals.length > 0 && (
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 10 }}>
                Signals Fired
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedThread.signals.map((s) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 8,
                      background: "#f9fafb",
                      border: "1px solid #f3f4f6",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global metrics summary */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", marginBottom: 12 }}>
              Team Overview
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                {
                  label: "Avg Tension",
                  value: avgTension.toFixed(2),
                  color:
                    avgTension > 0.6 ? "#dc2626" : avgTension > 0.35 ? "#d97706" : "#16a34a",
                },
                { label: "Active", value: String(activeCount), color: "#4f6ef7" },
                {
                  label: "High Risk",
                  value: String(THREADS.filter((t) => t.level === "high").length),
                  color: "#dc2626",
                },
                {
                  label: "Nudges",
                  value: "2",
                  color: "#374151",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    background: "#f9fafb",
                    border: "1px solid #f3f4f6",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard link */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6", marginTop: "auto" }}>
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 9,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                background: "white",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "#f9fafb";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "white";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e5e7eb";
              }}
            >
              ← Back to Home
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
