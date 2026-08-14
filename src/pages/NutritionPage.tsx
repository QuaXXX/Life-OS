interface PageProps {
  onBack: () => void;
}

export function NutritionPage({ onBack }: PageProps) {
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
            <path d="M12 2v8" />
            <path d="M4 10h16" />
            <path d="M5 10c0 6 2.5 10 7 10s7-4 7-10" />
          </svg>
        </div>
        <h2 className="placeholder-title">Nutrition</h2>
        <p className="placeholder-subtitle">Coming soon</p>
      </div>
    </div>
  );
}
