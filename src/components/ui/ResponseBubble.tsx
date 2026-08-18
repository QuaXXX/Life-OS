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
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                  isUser
                    ? 'bg-[var(--color-surface)] border border-white/[0.06] text-[var(--color-text)]'
                    : 'bg-transparent text-[var(--color-text)]'
                }`}
              >
                {m.content}
              </div>
            )}

            {/* Inline Choice Buttons */}
            {m.choicePrompt && (
              <div className="w-full max-w-[85%] bg-[var(--color-surface)] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 rounded-full bg-[var(--color-accent)] shrink-0" />
                  <p className="text-[14px] font-medium text-[var(--color-text)]">
                    {m.choicePrompt.question}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pl-4.5">
                  {m.choicePrompt.options.map((option, idx) => {
                    const isSelected = m.choicePrompt?.selected === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectChoice(option, m.id)}
                        disabled={!!m.choicePrompt?.selected}
                        className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                          isSelected
                            ? 'bg-[var(--color-accent)] text-black'
                            : m.choicePrompt?.selected
                            ? 'bg-white/5 text-[var(--color-muted)] opacity-50 cursor-not-allowed'
                            : 'bg-white/5 text-[var(--color-text)] hover:bg-white/10 active:scale-95'
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
              <div className="w-full max-w-[85%] bg-[var(--color-surface)] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-10 rounded-full bg-[var(--color-accent)] shrink-0" />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h4 className="font-semibold text-[15px] text-[var(--color-text)] truncate">{m.pendingAction.title}</h4>
                    <p className="text-[13px] text-[var(--color-muted)] mt-1 leading-snug">{m.pendingAction.detailsText}</p>
                  </div>
                </div>

                {m.pendingAction.status === 'pending' && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => cancelCalendarAction(m.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-[13px] font-medium text-[var(--color-text)] bg-white/5 hover:bg-white/10 transition active:scale-95 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmCalendarAction(m.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-[13px] font-semibold text-black bg-[var(--color-accent)] hover:opacity-90 transition active:scale-95 text-center"
                    >
                      Confirm
                    </button>
                  </div>
                )}
                {m.pendingAction.status === 'confirmed' && (
                  <div className="pt-2 flex justify-center">
                    <p className="text-[13px] text-[var(--color-accent)] font-medium flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Confirmed
                    </p>
                  </div>
                )}
                {m.pendingAction.status === 'cancelled' && (
                  <div className="pt-2 flex justify-center">
                    <p className="text-[13px] text-[var(--color-muted)] font-medium">Cancelled</p>
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
          <div className="max-w-[85%] px-4 py-3 text-[15px] leading-relaxed bg-[var(--color-surface)] border border-white/[0.06] text-[var(--color-text)] rounded-2xl">
            {transcript}
          </div>
        </div>
      )}

      {isThinking && !streamingResponse && (
        <div className="flex justify-start">
          <div className="thinking-indicator max-w-[85%] px-4 py-3 rounded-2xl bg-transparent">
            <span className="thinking-dot dot-1" />
            <span className="thinking-dot dot-2" />
            <span className="thinking-dot dot-3" />
          </div>
        </div>
      )}

      {streamingResponse && (
        <div className="flex justify-start">
          <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-transparent text-[var(--color-text)] text-[15px] leading-relaxed">
            {streamingResponse}
          </div>
        </div>
      )}
    </div>
  );
}
