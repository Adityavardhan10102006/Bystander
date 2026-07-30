export default function DashboardPage() {
  return (
    <div className="dashboard-layout animate-fade-in">
      
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: 600 }}>
          Your Teams
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href="#" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--text-primary)', fontWeight: 500, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            # general
          </a>
          <a href="#" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 500 }}>
            # engineering
          </a>
          <a href="#" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontWeight: 500 }}>
            # leadership
          </a>
        </nav>
        
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
           <a href="/" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
             Back to Home
           </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Team Health Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Monitoring #general for emerging conflict.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}>
              <span className="status-indicator low"></span> System Healthy
            </span>
          </div>
        </header>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Average Tension</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              0.12 <span style={{ fontSize: '1rem', color: 'var(--status-low)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>-0.05 ↓</span>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Active Threads</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              14
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Nudges Sent</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              2
            </div>
          </div>

        </div>

        {/* Active Conversations Section */}
        <section>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Active Conversations</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Thread 1 (High Risk) */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--status-high)' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>"API Gateway Refactor"</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>3 participants &bull; Last message 2m ago</p>
                <div style={{ marginTop: '0.75rem', display: 'inline-block', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-high)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
                  Signals: Rapid replies, tone shift detected
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-high)' }}>0.85</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tension Score</div>
              </div>
            </div>

            {/* Thread 2 (Low Risk) */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--status-low)' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>"Q3 Planning"</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>5 participants &bull; Last message 15m ago</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-low)' }}>0.15</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tension Score</div>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
