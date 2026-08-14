import { useVoice } from '../../services/voice/VoiceContext';

export function ResponseBubble() {
  const { streamingResponse, lastResponse, transcript, orbState, clearLastResponse } = useVoice();

  const displayText = streamingResponse || lastResponse;
  const isThinking = orbState === 'thinking';
  const isSpeaking = orbState === 'speaking';

  if (!displayText && !isThinking && !transcript) {
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
    </div>
  );
}
