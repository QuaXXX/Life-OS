import { useVoice } from '../../services/voice/VoiceContext';
import { useRef, useEffect } from 'react';

export function ResponseBubble() {
  const { 
    streamingResponse, 
    transcript, 
    orbState, 
    messages,
    confirmCalendarAction,
    cancelCalendarAction,
    selectChoice,
  } = useVoice();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingResponse, transcript, orbState]);

  const isThinking = orbState === 'thinking';

  // Find the last user message and assistant message to show a mini-chat, 
  // or just show the entire chat log if that's what's desired. Since it's scrollable, 
  // showing the chat log is great. Let's show all messages.
  if (messages.length === 0 && !streamingResponse && !isThinking && !transcript) {
    return null;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-8 w-full max-w-md mx-auto">
      {messages.map((m) => {
        if (!m.content && !m.functionCall && !m.functionResponse && !m.pendingAction && !m.choicePrompt) return null;
        if (m.functionResponse && !m.content && !m.pendingAction && !m.choicePrompt) return null;

        const isUser = m.role === 'user';
        return (
          <div
            key={m.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
          >
            {/* Standard Message Bubble */}
            {m.content && (
              <div
                className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[var(--color-accent)] text-black rounded-2xl rounded-br-none font-medium'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] rounded-2xl rounded-bl-none border border-white/5'
                }`}
              >
                {m.content}
              </div>
            )}

            {/* Inline Choice Buttons */}
            {m.choicePrompt && (
              <div className="max-w-[85%] bg-transparent border border-white/10 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5 opacity-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                  {m.choicePrompt.question}
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {m.choicePrompt.options.map((option, idx) => {
                    const isSelected = m.choicePrompt?.selected === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectChoice(option, m.id)}
                        disabled={!!m.choicePrompt?.selected}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--color-accent)] text-black shadow'
                            : m.choicePrompt?.selected
                            ? 'bg-black/20 text-[var(--color-muted)] opacity-50 cursor-not-allowed'
                            : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-accent)] hover:text-black border border-white/10 active:scale-95'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inline Confirmation Card */}
            {m.pendingAction && (
              <div className="max-w-[85%] bg-transparent border border-white/10 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-[var(--color-text)] opacity-90">{m.pendingAction.title}</h4>
                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5 leading-snug">{m.pendingAction.detailsText}</p>
                  </div>
                </div>

                {m.pendingAction.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => cancelCalendarAction(m.id)}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-[var(--color-muted)] bg-black/20 hover:bg-black/40 hover:text-[var(--color-text)] transition active:scale-95 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmCalendarAction(m.id)}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-black bg-[var(--color-accent)] hover:opacity-90 transition active:scale-95 text-center"
                    >
                      Confirm
                    </button>
                  </div>
                )}
                {m.pendingAction.status === 'confirmed' && (
                  <div className="pt-1 border-t border-white/5">
                    <p className="text-[11px] text-[var(--color-accent)] font-medium text-center">✓ Confirmed</p>
                  </div>
                )}
                {m.pendingAction.status === 'cancelled' && (
                  <div className="pt-1 border-t border-white/5">
                    <p className="text-[11px] text-[var(--color-muted)] font-medium text-center">Cancelled</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Transcript / Streaming */}
      {transcript && (
        <div className="flex flex-col items-end space-y-2">
          <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed bg-[var(--color-accent)] text-black rounded-2xl rounded-br-none font-medium">
            {transcript}
          </div>
        </div>
      )}

      {isThinking && !streamingResponse && (
        <div className="flex justify-start">
          <div className="thinking-indicator max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-none bg-[var(--color-surface)] border border-white/5">
            <span className="thinking-dot dot-1" />
            <span className="thinking-dot dot-2" />
            <span className="thinking-dot dot-3" />
          </div>
        </div>
      )}

      {streamingResponse && (
        <div className="flex justify-start">
          <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-none bg-[var(--color-surface)] text-[var(--color-text)] text-sm leading-relaxed border border-white/5">
            {streamingResponse}
          </div>
        </div>
      )}
    </div>
  );
}
