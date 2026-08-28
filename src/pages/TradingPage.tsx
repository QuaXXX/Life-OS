interface PageProps {
  onBack: () => void;
}

export function TradingPage({ onBack }: PageProps) {
  return (
    <div className="placeholder-page">
      <button onClick={onBack} className="back-btn" aria-label="Back to home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="placeholder-content">
        <div className="placeholder-icon">
          {/* Lucide TrendingUp */}
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h2 className="placeholder-title">Trading</h2>
        <p className="placeholder-subtitle">Coming soon</p>
      </div>
    </div>
  );
}
