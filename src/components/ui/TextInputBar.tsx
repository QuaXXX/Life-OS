import { useState, useRef, useEffect } from 'react';
import { useVoice } from '../../services/voice/VoiceContext';

export function TextInputBar() {
  const { isTextMode, setIsTextMode, sendMessage, orbState } = useVoice();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTextMode) {
      // Small delay so the animation starts before focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isTextMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || orbState === 'thinking') return;
    const toSend = text;
    setText('');
    await sendMessage(toSend, 'text');
  };

  // Just the toggle button — positioned inside the orb card
  if (!isTextMode) {
    return (
      <button
        onClick={() => setIsTextMode(true)}
        className="text-toggle-btn"
        aria-label="Open text input"
        title="Type to Life OS"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="8" x2="6.01" y2="8" />
          <line x1="10" y1="8" x2="10.01" y2="8" />
          <line x1="14" y1="8" x2="14.01" y2="8" />
          <line x1="18" y1="8" x2="18.01" y2="8" />
          <line x1="8" y1="16" x2="16" y2="16" />
        </svg>
      </button>
    );
  }

  // Expanded text input — overlays the caption area below the orb card
  return (
    <form onSubmit={handleSubmit} className="text-input-overlay">
      <button
        type="button"
        onClick={() => { setIsTextMode(false); setText(''); }}
        className="text-input-close"
        aria-label="Close text input"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask Life OS anything..."
        className="text-input-field"
        disabled={orbState === 'thinking'}
      />
      <button
        type="submit"
        disabled={!text.trim() || orbState === 'thinking'}
        className="text-send-btn"
        aria-label="Send message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
