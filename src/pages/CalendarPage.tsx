interface PageProps {
  onBack: () => void;
}

export function CalendarPage({ onBack }: PageProps) {
  return (
    <div className="placeholder-page">
      <button onClick={onBack} className="back-btn" aria-label="Back to home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h2 className="placeholder-title">Calendar</h2>
        <p className="placeholder-subtitle">Coming soon</p>
      </div>
    </div>
  );
}
