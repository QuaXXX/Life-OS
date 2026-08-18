import type { ChatMessage } from '../../services/ai/ChatService';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectChoice: (option: string, messageId: string) => void;
  onCancelAction: (messageId: string) => void;
  onConfirmAction: (messageId: string) => void;
}

export function ChatMessageItem({ message: m, onSelectChoice, onCancelAction, onConfirmAction }: ChatMessageItemProps) {
  // Hide internal tool acknowledgement entries
  if (m.functionResponse && !m.content && !m.pendingAction && !m.choicePrompt) return null;
  if (!m.content && !m.functionCall && !m.functionResponse && !m.pendingAction && !m.choicePrompt) return null;

  const isUser = m.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3 w-full`}>
      {/* Minimalist Message Text */}
      {m.content && (
        <div 
          className={`max-w-[85%] text-[15px] leading-[1.6] tracking-tight ${
            isUser ? 'text-white/60 text-right' : 'text-[var(--color-text)] text-left'
          }`}
        >
          {m.content}
        </div>
      )}

      {/* Minimalist Choice Prompt */}
      {m.choicePrompt && (
        <div className="max-w-[85%] pt-1 pb-2">
          <p className="text-[14px] font-medium text-[var(--color-text)] mb-2.5">
            {m.choicePrompt.question}
          </p>
          <div className="flex flex-wrap gap-2">
            {m.choicePrompt.options.map((option: string, idx: number) => {
              const isSelected = m.choicePrompt?.selected === option;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectChoice(option, m.id)}
                  disabled={!!m.choicePrompt?.selected}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-black border border-[var(--color-accent)]'
                      : m.choicePrompt?.selected
                      ? 'border border-white/5 text-[var(--color-muted)] opacity-50 cursor-not-allowed'
                      : 'border border-white/10 text-[var(--color-text)] hover:bg-white/5 active:scale-95'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Minimalist Confirmation Card */}
      {m.pendingAction && (
        <div className="max-w-[85%] pl-4 border-l-2 border-[var(--color-accent)] py-1 mt-1">
          <h4 className="font-semibold text-[15px] text-[var(--color-text)] tracking-tight">
            {m.pendingAction.title}
          </h4>
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5 leading-snug">
            {m.pendingAction.detailsText}
          </p>

          {m.pendingAction.status === 'pending' && (
            <div className="flex items-center gap-5 mt-3">
              <button
                onClick={() => onCancelAction(m.id)}
                className="text-[13px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95 origin-left"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmAction(m.id)}
                className="text-[13px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all active:scale-95 origin-left"
              >
                Confirm
              </button>
            </div>
          )}
          {m.pendingAction.status === 'confirmed' && (
            <div className="mt-2.5">
              <p className="text-[12.5px] text-[var(--color-accent)] font-medium flex items-center gap-1.5 opacity-90">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirmed
              </p>
            </div>
          )}
          {m.pendingAction.status === 'cancelled' && (
            <div className="mt-2.5">
              <p className="text-[12.5px] text-[var(--color-muted)] font-medium">Cancelled</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
