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

  if (messages.length === 0 && !streamingResponse && !isThinking && !transcript) {
    return null;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 pb-8 w-full scrollbar-hide">
      {messages.map((m) => (
        <ChatMessageItem
          key={m.id}
          message={m}
          onSelectChoice={selectChoice}
          onCancelAction={cancelCalendarAction}
          onConfirmAction={confirmCalendarAction}
        />
      ))}

      {/* Live transcript — muted right-aligned */}
      {transcript && (
        <div className="w-full text-right mb-3">
          <p className="text-sm text-white/40 italic">{transcript}</p>
        </div>
      )}

      {/* Thinking indicator — simple text */}
      {isThinking && !streamingResponse && (
        <div className="w-full mb-3">
          <p className="text-[13px] text-white/30 animate-pulse">Life OS is thinking…</p>
        </div>
      )}

      {/* Streaming response — fluid inline text */}
      {streamingResponse && (
        <div className="w-full mb-3">
          <p className="text-[15px] leading-relaxed tracking-tight text-white/90">{streamingResponse}</p>
        </div>
      )}
    </div>
  );
}
