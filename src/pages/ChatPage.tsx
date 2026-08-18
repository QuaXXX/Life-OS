import React, { useState, useRef, useEffect } from 'react';
import { useVoice } from '../services/voice/VoiceContext';

interface PageProps {
  onBack: () => void;
}

export function ChatPage({ onBack }: PageProps) {
  const { 
    messages, 
    streamingResponse, 
    orbState, 
    sendMessage, 
    startListening, 
    stopListening,
    confirmCalendarAction,
    cancelCalendarAction,
    selectChoice,
  } = useVoice();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isThinking = orbState === 'thinking';
  const isListening = orbState === 'listening';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse, isThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    const textToSend = inputText;
    setInputText('');
    await sendMessage(textToSend, 'text');
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-[var(--color-bg)] text-[var(--color-text)] relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-surface)] bg-[var(--color-bg)]/80 backdrop-blur z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[var(--color-surface)] transition text-[var(--color-muted)] hover:text-[var(--color-text)]"
          aria-label="Back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wide">Life OS Chat</h2>
        </div>
        <div className="w-8" />
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streamingResponse && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 text-[var(--color-muted)]">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--color-text)] mb-1">How can I help you today?</p>
            <p className="text-xs">Ask me what day it is, schedule events, or manage your routine.</p>
          </div>
        )}

        {messages.map((m) => {
          if (!m.content && !m.functionCall && !m.functionResponse && !m.pendingAction && !m.choicePrompt) return null;
          // Hide internal tool acknowledgement entries
          if (m.functionResponse && !m.content && !m.pendingAction && !m.choicePrompt) return null;

          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
            >
              {/* Message Bubble */}
              {m.content && (
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[var(--color-accent)] text-black rounded-br-none font-medium'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] rounded-bl-none border border-white/5'
                  }`}
                >
                  {m.content}
                </div>
              )}

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
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
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

              {/* Inline Confirmation Card (for Calendar Actions) */}
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
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-[var(--color-muted)] bg-black/20 hover:bg-black/40 hover:text-[var(--color-text)] transition active:scale-95 text-center"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmCalendarAction(m.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-black bg-[var(--color-accent)] hover:opacity-90 transition active:scale-95 text-center"
                      >
                        Confirm & Sync
                      </button>
                    </div>
                  )}

                  {m.pendingAction.status === 'confirmed' && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-medium pt-1 border-t border-white/5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Confirmed & Synced</span>
                    </div>
                  )}

                  {m.pendingAction.status === 'cancelled' && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] font-medium pt-1 border-t border-white/5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Cancelled</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Live Streaming Response */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-none bg-[var(--color-surface)] text-[var(--color-text)] text-sm leading-relaxed border border-white/5">
              {streamingResponse}
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {isThinking && !streamingResponse && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-[var(--color-surface)] border border-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Bar */}
      <div className="p-3 border-t border-[var(--color-surface)] bg-[var(--color-bg)]/90 backdrop-blur pb-safe">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Type a message or event..."}
            disabled={isListening}
            className="flex-1 px-4 py-2.5 rounded-full bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none border border-transparent focus:border-[var(--color-accent)] transition"
          />

          {/* Voice Hold Button */}
          <button
            type="button"
            onPointerDown={startListening}
            onPointerUp={stopListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
            aria-label="Hold to talk"
            title="Hold to talk"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Text Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-black flex items-center justify-center font-bold disabled:opacity-30 disabled:pointer-events-none transition-transform active:scale-95"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
