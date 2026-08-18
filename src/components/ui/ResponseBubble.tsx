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
            {/* Minimalist Message Text */}
            {m.content && (
              <div className={`max-w-[85%] text-[15px] leading-[1.6] tracking-tight ${isUser ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)]'}`}>
                {m.content}
              </div>
            )}

            {/* Minimalist Choice Prompt */}
            {m.choicePrompt && (
              <div className="max-w-[85%] pt-1 pb-2">
                <p className="text-[14px] font-medium text-[var(--color-text)] mb-3">
                  {m.choicePrompt.question}
                </p>
                <div className="flex flex-wrap gap-2">
                  {m.choicePrompt.options.map((option, idx) => {
                    const isSelected = m.choicePrompt?.selected === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectChoice(option, m.id)}
                        disabled={!!m.choicePrompt?.selected}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[var(--color-accent)] text-black border border-[var(--color-accent)]'
                            : m.choicePrompt?.selected
                            ? 'border border-white/5 text-[var(--color-muted)] opacity-50 cursor-not-allowed'
                            : 'border border-white/10 text-[var(--color-text)] hover:bg-white/5'
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
              <div className="max-w-[85%] pl-4 border-l-2 border-[var(--color-accent)] py-1 my-2">
                <h4 className="font-medium text-[15px] text-[var(--color-text)] tracking-tight">{m.pendingAction.title}</h4>
                <p className="text-[13px] text-[var(--color-muted)] mt-1">{m.pendingAction.detailsText}</p>

                {m.pendingAction.status === 'pending' && (
                  <div className="flex items-center gap-6 mt-4">
                    <button
                      onClick={() => cancelCalendarAction(m.id)}
                      className="text-[13px] font-medium text-[var(--color-muted)] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmCalendarAction(m.id)}
                      className="text-[13px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all"
                    >
                      Confirm
                    </button>
                  </div>
                )}
                {m.pendingAction.status === 'confirmed' && (
                  <div className="mt-3">
                    <p className="text-[12px] text-[var(--color-accent)] font-medium flex items-center gap-1.5 opacity-90">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Confirmed
                    </p>
                  </div>
                )}
                {m.pendingAction.status === 'cancelled' && (
                  <div className="mt-3">
                    <p className="text-[12px] text-[var(--color-muted)] font-medium">Cancelled</p>
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
          <div className="max-w-[85%] text-[15px] leading-[1.6] tracking-tight text-[var(--color-muted)] italic opacity-80">
            {transcript}
          </div>
        </div>
      )}

      {isThinking && !streamingResponse && (
        <div className="flex justify-start pt-1">
          <div className="thinking-indicator bg-transparent">
            <span className="thinking-dot dot-1" />
            <span className="thinking-dot dot-2" />
            <span className="thinking-dot dot-3" />
          </div>
        </div>
      )}

      {streamingResponse && (
        <div className="flex justify-start pt-1">
          <div className="max-w-[85%] text-[15px] leading-[1.6] tracking-tight text-[var(--color-text)]">
            {streamingResponse}
          </div>
        </div>
      )}
    </div>
  );
}
