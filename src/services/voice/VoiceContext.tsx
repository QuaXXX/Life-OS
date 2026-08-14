import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { OrbState } from './types';
import { WebSpeechInput } from './WebSpeechInput';
import { stubRouter } from '../command/StubRouter';

interface VoiceContextValue {
  orbState: OrbState;
  transcript: string;
  lastResponse: string;
  startListening: () => void;
  stopListening: () => void;
}

const VoiceCtx = createContext<VoiceContextValue>({
  orbState: 'idle',
  transcript: '',
  lastResponse: '',
  startListening: () => {},
  stopListening: () => {},
});

export function useVoice(): VoiceContextValue {
  return useContext(VoiceCtx);
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const inputRef = useRef(new WebSpeechInput());

  const startListening = useCallback(() => {
    setOrbState('listening');
    setTranscript('');
    if (inputRef.current.isSupported()) {
      inputRef.current.start();
    }
  }, []);

  const stopListening = useCallback(async () => {
    setOrbState('thinking');
    let text = '';
    if (inputRef.current.isSupported()) {
      text = await inputRef.current.stop();
    }
    setTranscript(text);

    // Route through shared command pipeline
    const result = await stubRouter.process(text);
    setLastResponse(result.message);
    setOrbState('idle');
  }, []);

  return (
    <VoiceCtx.Provider
      value={{ orbState, transcript, lastResponse, startListening, stopListening }}
    >
      {children}
    </VoiceCtx.Provider>
  );
}
