export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section style={{ padding: '8rem 0', textAlign: 'center', position: 'relative' }}>
        <div className="container animate-fade-in">
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-full)', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem' }}>
            Introducing Bystander 1.0
          </div>
          <h1 style={{ fontSize: '4.5rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem auto' }}>
            Predict & Resolve <span className="text-gradient">Team Conflict</span> Before It Escalates
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem auto', lineHeight: 1.7 }}>
            AI-powered mediation for modern chat platforms. We analyze subtle tension signals and deliver private, empathetic nudges to keep your team healthy and productive.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              View Live Dashboard
            </a>
            <a href="https://github.com" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Read Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '5rem 0', background: 'rgba(15, 17, 26, 0.4)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }} className="animate-fade-in delay-100">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>How it works</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '1rem' }}>Seamless integration into your existing workflow.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Feature 1 */}
            <div className="glass-panel animate-fade-in delay-200" style={{ padding: '2.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Real-time NLP Analysis</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Every message is privately analyzed for sentiment, emotion, and language patterns without saving raw text long-term.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel animate-fade-in delay-300" style={{ padding: '2.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-medium)', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01"></path><path d="M7 20v-4"></path><path d="M12 20v-8"></path><path d="M17 20V8"></path><path d="M22 4v16"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Tension Prediction</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Our models look for reply gaps, interruptions, and tone shifts to confidently predict escalating tension before it boils over.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel animate-fade-in delay-300" style={{ padding: '2.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-low)', marginBottom: '1.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Private Nudges</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                When risk is high, Bystander sends private, non-judgmental rewrite suggestions or check-in prompts directly to the user.
              </p>
            </div>
            
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{ padding: '3rem 0', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
        <p>&copy; 2026 Bystander Inc. All rights reserved.</p>
      </footer>
    </main>
  );
}
