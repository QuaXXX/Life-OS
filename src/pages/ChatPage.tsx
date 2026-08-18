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

              {/* Inline Confirmation Card (for Calendar Actions) */}
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
