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
    <div className={`w-full mb-3 ${isUser ? 'text-right' : 'text-left'}`}>
      {/* Fluid text — no bubble backgrounds */}
      {m.content && (
        <p className={`text-[15px] leading-relaxed tracking-tight whitespace-pre-wrap ${
          isUser
            ? 'text-white/40 text-sm'
            : 'text-white/90'
        }`}>
          {m.content}
        </p>
      )}

      {/* Choice Prompt — horizontal pill chips */}
      {m.choicePrompt && (
        <div className="mt-2.5">
          <p className="text-[13px] text-white/60 mb-2">
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
                      ? 'bg-[var(--color-accent)] text-black'
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

      {/* Pending Action — thin accent border card */}
      {m.pendingAction && (
        <div className="mt-2 border-l-2 border-[var(--color-accent)]/60 pl-3 py-1">
          <p className="text-[13px] font-medium text-white/80">{m.pendingAction.title}</p>
          <p className="text-[12px] text-white/50 mt-0.5 leading-snug">{m.pendingAction.detailsText}</p>

          {m.pendingAction.status === 'pending' && (
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => onConfirmAction(m.id)}
                className="text-[12px] font-semibold text-[var(--color-accent)] hover:brightness-110 active:scale-95"
              >
                Confirm
              </button>
              <button
                onClick={() => onCancelAction(m.id)}
                className="text-[12px] text-white/40 hover:text-white/70 active:scale-95"
              >
                Cancel
              </button>
            </div>
          )}
          {m.pendingAction.status === 'confirmed' && (
            <p className="text-[11px] text-[var(--color-accent)]/80 mt-1.5 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Done
            </p>
          )}
          {m.pendingAction.status === 'cancelled' && (
            <p className="text-[11px] text-white/30 mt-1.5">Cancelled</p>
          )}
        </div>
      )}
    </div>
  );
}
