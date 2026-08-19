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
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full mb-4`}>
      {/* Sleek Chat Bubble */}
      {m.content && (
        <div 
          className={`max-w-[85%] px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed tracking-tight ${
            isUser 
              ? 'bg-[var(--color-accent)] text-black rounded-tr-[4px]' 
              : 'bg-[#1a1e25] text-white/90 rounded-tl-[4px] border border-white/5'
          }`}
        >
          {m.content}
        </div>
      )}

      {/* Choice Prompt (Inline Options) */}
      {m.choicePrompt && (
        <div className={`max-w-[85%] mt-2 p-3.5 rounded-[20px] bg-[#1a1e25] border border-[var(--color-accent)]/20 ${!m.content ? 'rounded-tl-[4px]' : ''}`}>
          <p className="text-[14px] font-medium text-white/90 mb-3">
            {m.choicePrompt.question}
          </p>
          <div className="flex flex-col gap-2">
            {m.choicePrompt.options.map((option: string, idx: number) => {
              const isSelected = m.choicePrompt?.selected === option;
              const hasSelection = !!m.choicePrompt?.selected;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectChoice(option, m.id)}
                  disabled={hasSelection}
                  className={`w-full py-2.5 px-4 rounded-[12px] text-[13.5px] font-medium transition-all text-left flex justify-between items-center ${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-black'
                      : hasSelection
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 active:scale-[0.98]'
                  }`}
                >
                  {option}
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Action Card */}
      {m.pendingAction && (
        <div className={`max-w-[85%] mt-2 p-4 rounded-[20px] bg-[#1a1e25] border border-[var(--color-accent)]/30 ${!m.content && !m.choicePrompt ? 'rounded-tl-[4px]' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h4 className="font-semibold text-[14px] text-white tracking-tight">
              {m.pendingAction.title}
            </h4>
          </div>
          
          <p className="text-[13px] text-white/60 leading-relaxed mb-4">
            {m.pendingAction.detailsText}
          </p>

          {m.pendingAction.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCancelAction(m.id)}
                className="flex-1 py-2.5 rounded-[12px] bg-white/5 text-white/70 text-[13px] font-medium hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmAction(m.id)}
                className="flex-1 py-2.5 rounded-[12px] bg-[var(--color-accent)] text-black text-[13px] font-semibold hover:brightness-110 transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          )}
          {m.pendingAction.status === 'confirmed' && (
            <div className="py-2 px-3 rounded-[10px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[12px] font-semibold flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmed
            </div>
          )}
          {m.pendingAction.status === 'cancelled' && (
            <div className="py-2 px-3 rounded-[10px] bg-white/5 text-white/40 text-[12px] font-medium flex items-center justify-center">
              Cancelled
            </div>
          )}
        </div>
      )}
    </div>
  );
}
