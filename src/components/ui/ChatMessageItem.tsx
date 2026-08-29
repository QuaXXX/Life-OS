import type { ChatMessage } from '../../services/ai/ChatService';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectChoice: (option: string, messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  onConfirmAction: (messageId: string) => void;
}

export function ChatMessageItem({ message: m, onSelectChoice, onCancelAction, onConfirmAction }: ChatMessageItemProps) {
  if (m.functionResponse && !m.content && !m.pendingAction && !m.choicePrompt) return null;
  if (!m.content && !m.functionCall && !m.functionResponse && !m.pendingAction && !m.choicePrompt) return null;

  const isUser = m.role === 'user';

  return (
    <div className={`w-full mb-3.5 ${isUser ? 'text-right' : 'text-left'}`}>
      {/* Text */}
      {m.content && (
        <p className={`text-[15px] leading-relaxed tracking-tight whitespace-pre-wrap ${
          isUser ? 'text-white/40 text-sm' : 'text-white/90'
        }`}>
          {m.content}
        </p>
      )}

      {/* Choice chips */}
      {m.choicePrompt && (
        <div className="mt-2.5">
          <p className="text-[13px] text-[var(--color-muted)] mb-2">
            {m.choicePrompt.question}
          </p>
          <div className="flex flex-wrap gap-2">
            {m.choicePrompt.options.map((option: string, idx: number) => {
              const isSelected = m.choicePrompt?.selected === option;
              const hasSelection = !!m.choicePrompt?.selected;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectChoice(option, m.id)}
                  disabled={hasSelection}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-[#12151a]'
                      : hasSelection
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 active:scale-95'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action card */}
      {m.pendingAction && (
        <div className="mt-3 px-4 py-3.5 rounded-2xl bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-dim)] flex items-center justify-center text-[var(--color-accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-white tracking-tight">{m.pendingAction.title}</p>
          </div>

          <p className="text-[13px] text-[var(--color-muted)] leading-relaxed mb-3">
            {m.pendingAction.detailsText}
          </p>

          {m.pendingAction.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onConfirmAction(m.id)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-[#12151a] text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirm
              </button>
              <button
                onClick={() => onCancelAction(m.id)}
                className="py-2.5 px-4 rounded-xl bg-[var(--color-bg)] text-[var(--color-muted)] text-[13px] font-medium active:scale-95 transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {m.pendingAction.status === 'confirmed' && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-accent)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Added to Calendar
            </div>
          )}

          {m.pendingAction.status === 'cancelled' && (
            <p className="text-[12px] font-medium text-[var(--color-muted)]">Cancelled</p>
          )}
        </div>
      )}
    </div>
  );
}
