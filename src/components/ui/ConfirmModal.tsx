interface ConfirmModalProps {
  title: string;
  detailsText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, detailsText, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="calendar-modal-overlay">
      <div className="calendar-modal-card confirm-modal">
        <div className="w-10 h-10 rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)] flex items-center justify-center mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[var(--color-text)] mb-1">
          {title}
        </h3>
        <p className="text-xs text-[var(--color-muted)] mb-3 text-center">
          {detailsText}
        </p>

        <div className="calendar-alert alert-info text-xs mb-4">
          Target: <strong>Dedicated "Life OS" Google Calendar</strong>
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onCancel}
            className="calendar-btn-secondary flex-1 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="calendar-btn-primary flex-1 text-xs"
          >
            Confirm & Sync
          </button>
        </div>
      </div>
    </div>
  );
}
