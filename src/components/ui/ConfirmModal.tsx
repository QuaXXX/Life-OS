interface ConfirmModalProps {
  title: string;
  detailsText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, detailsText, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[var(--color-bg)]/95 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="pl-4 border-l-2 border-[var(--color-accent)]">
          <h3 className="text-[16px] font-semibold text-[var(--color-text)] tracking-tight">
            {title}
          </h3>
          <p className="text-[14px] text-[var(--color-muted)] mt-1.5 leading-snug">
            {detailsText}
          </p>

          <div className="mt-4 text-[12px] font-medium text-[var(--color-accent)] opacity-80 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Target: Dedicated "Life OS" Calendar
          </div>

          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={onCancel}
              className="text-[14px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95 origin-left"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="text-[14px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all active:scale-95 origin-left"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
