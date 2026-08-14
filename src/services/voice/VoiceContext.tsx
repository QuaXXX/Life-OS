import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { OrbState } from './types';
import { WebSpeechInput } from './WebSpeechInput';
import { WebSpeechOutput } from './WebSpeechOutput';
import { chatService, type ChatMessage } from '../ai/ChatService';

interface VoiceContextValue {
  orbState: OrbState;
  transcript: string;
  streamingResponse: string;
  lastResponse: string;
  isTextMode: boolean;
  messages: ChatMessage[];
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (text: string, inputMethod?: 'voice' | 'text') => Promise<void>;
  setIsTextMode: (val: boolean) => void;
  clearLastResponse: () => void;
}

const VoiceCtx = createContext<VoiceContextValue>({
  orbState: 'idle',
  transcript: '',
  streamingResponse: '',
  lastResponse: '',
  isTextMode: false,
  messages: [],
  startListening: () => {},
  stopListening: () => {},
  sendMessage: async () => {},
  setIsTextMode: () => {},
  clearLastResponse: () => {},
});

export function useVoice(): VoiceContextValue {
  return useContext(VoiceCtx);
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [isTextMode, setIsTextMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const inputRef = useRef(new WebSpeechInput());
  const outputRef = useRef(new WebSpeechOutput());

  const clearLastResponse = useCallback(() => {
    setLastResponse('');
    setStreamingResponse('');
    setTranscript('');
  }, []);

  const sendMessage = useCallback(
    async (text: string, inputMethod: 'voice' | 'text' = 'voice') => {
      const cleanText = text.trim();
      if (!cleanText) {
        setOrbState('idle');
        return;
      }

      setOrbState('thinking');
      setTranscript(cleanText);
      setStreamingResponse('');
      setLastResponse('');

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: cleanText,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      try {
        let fullAnswer = '';
        await chatService.streamChat(updatedMessages, (_chunk, accumulated) => {
          fullAnswer = accumulated;
          setStreamingResponse(accumulated);
        });

        const assistantMessage: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: fullAnswer,
        };
        setMessages([...updatedMessages, assistantMessage]);
        setLastResponse(fullAnswer);
        setStreamingResponse('');

        if (inputMethod === 'voice' && fullAnswer) {
          // Play audio via TTS and pulse orb while speaking
          await outputRef.current.speak(fullAnswer, {
            onStart: () => {
              setOrbState('speaking');
            },
            onEnd: () => {
              setOrbState('idle');
            },
            onError: () => {
              setOrbState('idle');
            },
          });
        } else {
          setOrbState('idle');
        }
      } catch (err: any) {
        console.error('Error in sendMessage:', err);
        const errMsg = err?.message || 'Sorry, I encountered an error connecting to Life OS.';
        setLastResponse(errMsg);
        setStreamingResponse('');
        setOrbState('idle');
      }
    },
    [messages]
  );

  const startListening = useCallback(() => {
    outputRef.current.cancel(); // Stop any currently playing speech
    setOrbState('listening');
    setTranscript('');
    setStreamingResponse('');
    setLastResponse('');
    if (inputRef.current.isSupported()) {
      inputRef.current.start();
    }
  }, []);

  const stopListening = useCallback(async () => {
    let capturedText = '';
    if (inputRef.current.isSupported()) {
      capturedText = await inputRef.current.stop();
    }

    if (capturedText && capturedText.trim()) {
      await sendMessage(capturedText, 'voice');
    } else {
      setOrbState('idle');
    }
  }, [sendMessage]);

  return (
    <VoiceCtx.Provider
      value={{
        orbState,
        transcript,
        streamingResponse,
        lastResponse,
        isTextMode,
        messages,
        startListening,
        stopListening,
        sendMessage,
        setIsTextMode,
        clearLastResponse,
      }}
    >
      {children}
    </VoiceCtx.Provider>
  );
}
