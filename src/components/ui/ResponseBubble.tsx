import { useVoice } from '../../services/voice/VoiceContext';
import { useRef, useEffect } from 'react';
import { ChatMessageItem } from './ChatMessageItem';

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
      {messages.map((m) => (
        <ChatMessageItem
          key={m.id}
          message={m}
          onSelectChoice={selectChoice}
          onCancelAction={cancelCalendarAction}
          onConfirmAction={confirmCalendarAction}
        />
      ))}

      {/* Transcript / Streaming */}
      {transcript && (
        <div className="flex flex-col items-end w-full">
          <div className="max-w-[85%] text-[15px] leading-[1.6] tracking-tight text-white/60 italic text-right">
            {transcript}
          </div>
        </div>
      )}

      {isThinking && !streamingResponse && (
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {streamingResponse && (
        <div className="flex flex-col items-start w-full">
          <div className="max-w-[85%] text-[15px] leading-[1.6] tracking-tight text-[var(--color-text)]">
            {streamingResponse}
          </div>
        </div>
      )}
    </div>
  );
}
