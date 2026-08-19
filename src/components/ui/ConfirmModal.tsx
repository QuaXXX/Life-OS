interface ConfirmModalProps {
  title: string;
  detailsText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, detailsText, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" onClick={onCancel} />
      <div className="relative bg-[#1a1e25] rounded-t-[28px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pb-safe">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />
        <h3 className="text-[18px] font-semibold text-white tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-[14px] text-white/50 leading-relaxed mb-8">
          {detailsText}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-xl bg-[var(--color-accent)] text-black text-[15px] font-semibold hover:brightness-110 transition-all active:scale-[0.98]"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 rounded-xl bg-white/5 text-white/70 text-[15px] font-medium hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
