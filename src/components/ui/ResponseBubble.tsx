import { useVoice } from '../../services/voice/VoiceContext';

export function ResponseBubble() {
  const { 
    streamingResponse, 
    lastResponse, 
    transcript, 
    orbState, 
    clearLastResponse,
    messages,
    pendingCalendarAction,
    confirmCalendarAction,
    cancelCalendarAction,
    selectChoice,
  } = useVoice();

  const displayText = streamingResponse || lastResponse;
  const isThinking = orbState === 'thinking';
  const isSpeaking = orbState === 'speaking';

  const lastMsg = messages[messages.length - 1];
  const choicePrompt = lastMsg?.role === 'assistant' ? lastMsg.choicePrompt : undefined;

  if (!displayText && !isThinking && !transcript && !pendingCalendarAction && !choicePrompt) {
    return null;
  }

  return (
    <div className="response-bubble-container">
      {transcript && (
        <div className="user-query-preview">
          <span className="user-query-text">"{transcript}"</span>
        </div>
      )}

      {isThinking && !streamingResponse && (
        <div className="thinking-indicator">
          <span className="thinking-dot dot-1" />
          <span className="thinking-dot dot-2" />
          <span className="thinking-dot dot-3" />
        </div>
      )}

      {displayText && (
        <div className={`response-bubble ${isSpeaking ? 'response-bubble--speaking' : ''}`}>
          <div className="response-bubble-content">
            <p className="response-bubble-text">{displayText}</p>
          </div>
          <button
            onClick={clearLastResponse}
            className="response-bubble-dismiss"
            aria-label="Dismiss response"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Inline Choice Buttons (Under Orb) */}
      {choicePrompt && (
        <div className="mt-2 w-full max-w-xs mx-auto bg-transparent border border-white/10 rounded-2xl p-3 space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1.5 opacity-90">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
            {choicePrompt.question}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {choicePrompt.options.map((option, idx) => {
              const isSelected = choicePrompt.selected === option;
              return (
                <button
                  key={idx}
                  onClick={() => selectChoice(option, lastMsg?.id)}
                  disabled={!!choicePrompt.selected}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--color-accent)] text-black shadow'
                      : choicePrompt.selected
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

      {/* Inline Action Card (Under Orb) */}
      {pendingCalendarAction && (
        <div className="mt-2 w-full max-w-xs mx-auto bg-transparent border border-white/10 rounded-2xl p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-[var(--color-text)] opacity-90">{pendingCalendarAction.title}</h4>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5 leading-tight">{pendingCalendarAction.detailsText}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            <button
              onClick={() => cancelCalendarAction()}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-[var(--color-muted)] bg-black/20 hover:bg-black/40 hover:text-[var(--color-text)] transition active:scale-95 text-center"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmCalendarAction()}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-black bg-[var(--color-accent)] hover:opacity-90 transition active:scale-95 text-center"
            >
              Confirm & Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
