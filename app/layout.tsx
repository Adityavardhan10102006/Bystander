import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bystander | AI Conflict Mediation",
  description: "AI-powered conflict prediction & mediation for team chat platforms",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1.25rem 2rem', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 17, 26, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>B</div>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Bystander</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <a href="/" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Home</a>
              <a href="/dashboard" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Dashboard</a>
              <a href="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Open App</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
