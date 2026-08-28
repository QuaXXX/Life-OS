import { useState, useEffect } from 'react';
import { subscribeToasts, dismissToast, type ToastMessage } from '../../utils/toast';

const typeStyles: Record<string, string> = {
  success: 'bg-[var(--color-accent)] text-black',
  error: 'bg-[var(--color-danger)] text-white',
  info: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-white/10',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2 pt-3 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto px-5 py-2.5 rounded-full text-[13px] font-medium shadow-lg backdrop-blur-md animate-[slideDown_200ms_ease-out] cursor-pointer transition-opacity hover:opacity-80 ${typeStyles[t.type] || typeStyles.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
