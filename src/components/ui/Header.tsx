export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4">
      {/* Brain icon + wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
          {/* Explicit brain SVG — two hemispheres with sulci */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Left hemisphere */}
            <path d="M12 2a5 5 0 0 0-4.5 2.8A4 4 0 0 0 3 9a4 4 0 0 0 1.5 3.1A3.5 3.5 0 0 0 4 14.5 3.5 3.5 0 0 0 7 18h1V9.5a4 4 0 0 1 4-4" />
            {/* Right hemisphere */}
            <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 21 9a4 4 0 0 1-1.5 3.1 3.5 3.5 0 0 1 .5 2.4A3.5 3.5 0 0 1 17 18h-1V9.5a4 4 0 0 0-4-4" />
            {/* Stem */}
            <path d="M8 18v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2" />
            {/* Left sulci */}
            <path d="M7 11c-1 0-1.5-.5-1.5-1" />
            <path d="M6.5 14c-.8 0-1.3-.4-1.4-1" />
            {/* Right sulci */}
            <path d="M17 11c1 0 1.5-.5 1.5-1" />
            <path d="M17.5 14c.8 0 1.3-.4 1.4-1" />
          </svg>
        </div>
        <span className="text-[var(--color-text)] text-lg font-semibold tracking-wide leading-none">
          Life OS
        </span>
      </div>

      {/* Bell icon with red dot */}
      <button className="relative w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center transition-transform duration-100 active:scale-90 shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Unread dot */}
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full border-2 border-[var(--color-bg)]" />
      </button>
    </header>
  );
}
