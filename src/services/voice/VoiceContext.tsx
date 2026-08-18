import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { OrbState } from './types';
import { WebSpeechInput } from './WebSpeechInput';
import { WebSpeechOutput } from './WebSpeechOutput';
import { chatService, type ChatMessage } from '../ai/ChatService';
import { calendarClient } from '../calendar/CalendarClient';

export type PendingCalendarAction = {
  type: 'create' | 'update' | 'delete';
  title: string;
  detailsText: string;
  data: any;
  toolCallId: string;
  functionName: string;
};

interface VoiceContextValue {
  orbState: OrbState;
  transcript: string;
  streamingResponse: string;
  lastResponse: string;
  isTextMode: boolean;
  messages: ChatMessage[];
  pendingCalendarAction: PendingCalendarAction | null;
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (text: string, inputMethod?: 'voice' | 'text') => Promise<void>;
  setIsTextMode: (val: boolean) => void;
  clearLastResponse: () => void;
  confirmCalendarAction: () => Promise<void>;
  cancelCalendarAction: () => Promise<void>;
}

const VoiceCtx = createContext<VoiceContextValue>({
  orbState: 'idle',
  transcript: '',
  streamingResponse: '',
  lastResponse: '',
  isTextMode: false,
  messages: [],
  pendingCalendarAction: null,
  startListening: () => {},
  stopListening: () => {},
  sendMessage: async () => {},
  setIsTextMode: () => {},
  clearLastResponse: () => {},
  confirmCalendarAction: async () => {},
  cancelCalendarAction: async () => {},
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
  const [pendingCalendarAction, setPendingCalendarAction] = useState<PendingCalendarAction | null>(null);

  const inputRef = useRef(new WebSpeechInput());
  const outputRef = useRef(new WebSpeechOutput());

  const clearLastResponse = useCallback(() => {
    setLastResponse('');
    setStreamingResponse('');
    setTranscript('');
  }, []);

  const handleToolCalls = async (
    functionCalls: any[], 
    currentMessages: ChatMessage[],
    inputMethod: 'voice' | 'text'
  ) => {
    let newMessages = [...currentMessages];
    let needsAnotherTurn = false;
    let actionPending = false;

    for (const call of functionCalls) {
      const { name, args } = call;
      
      if (name === 'getEvents') {
        try {
          const events = await calendarClient.getEvents({ startDate: args.startDate, endDate: args.endDate });
          newMessages.push({
            id: `tool-${Date.now()}`,
            role: 'user',
            content: '',
            functionResponse: { name: 'getEvents', response: { events } }
          });
          needsAnotherTurn = true;
        } catch (err: any) {
          newMessages.push({
            id: `tool-err-${Date.now()}`,
            role: 'user',
            content: '',
            functionResponse: { name: 'getEvents', response: { error: err.message } }
          });
          needsAnotherTurn = true;
        }
      } else if (name === 'createEvent' || name === 'updateEvent' || name === 'deleteEvent') {
        // Intercept mutation for confirmation
        let title = 'Confirm Action';
        let detailsText = '';
        if (name === 'createEvent') {
          title = 'Confirm Add Event';
          detailsText = `Add "${args.title}" on ${args.date} (${args.startTime} - ${args.endTime})?`;
        } else if (name === 'updateEvent') {
          title = 'Confirm Event Update';
          detailsText = `Update event to "${args.changes?.title || 'new details'}" on ${args.changes?.date || ''}?`;
        } else if (name === 'deleteEvent') {
          title = 'Confirm Event Deletion';
          detailsText = `Delete this event from your calendar?`;
        }
        
        setPendingCalendarAction({
          type: name === 'createEvent' ? 'create' : name === 'updateEvent' ? 'update' : 'delete',
          title,
          detailsText,
          data: args,
          toolCallId: name,
          functionName: name
        });
        
        setMessages(newMessages); // Save current messages containing the assistant's functionCall
        actionPending = true;
        break; // Only handle one pending action at a time for UI simplicity
      }
    }

    if (needsAnotherTurn && !actionPending) {
      setMessages(newMessages);
      await triggerAiTurn(newMessages, currentMessages, inputMethod);
    } else if (!actionPending) {
      setOrbState('idle');
    }
  };

  const triggerAiTurn = async (currentMessages: ChatMessage[], originalMessages: ChatMessage[], inputMethod: 'voice' | 'text') => {
    setOrbState('thinking');
    
    try {
      const { fullText, functionCalls } = await chatService.streamChat(currentMessages, (_chunk, accumulated) => {
        setStreamingResponse(accumulated);
      });

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        // If there were function calls, we attach them to the assistant's message in history
        ...(functionCalls.length > 0 && { functionCall: functionCalls[0] }) 
      };
      
      const newMessages = [...currentMessages, assistantMessage];
      setMessages(newMessages);
      
      if (fullText) {
        setLastResponse(fullText);
      }
      setStreamingResponse('');

      if (functionCalls.length > 0) {
        // Only speak the text if we're also about to show a confirmation
        if (inputMethod === 'voice' && fullText) {
          await outputRef.current.speak(fullText, {
            onStart: () => setOrbState('speaking'),
            onEnd: () => setOrbState('idle'),
            onError: () => setOrbState('idle'),
          });
        }
        await handleToolCalls(functionCalls, newMessages, inputMethod);
      } else {
        if (inputMethod === 'voice' && fullText) {
          await outputRef.current.speak(fullText, {
            onStart: () => setOrbState('speaking'),
            onEnd: () => setOrbState('idle'),
            onError: () => setOrbState('idle'),
          });
        } else {
          setOrbState('idle');
        }
      }
    } catch (err: any) {
      console.error('Error in AI turn:', err);
      const errMsg = err?.message || 'Sorry, I encountered an error connecting to Life OS.';
      setLastResponse(errMsg);
      setStreamingResponse('');
      setOrbState('idle');
      
      // Roll back the messages array to its previous state before this turn
      // This prevents a malformed tool-call or user turn from poisoning the history
      setMessages(originalMessages);
    }
  };

  const confirmCalendarAction = useCallback(async () => {
    if (!pendingCalendarAction) return;
    const action = pendingCalendarAction;
    setPendingCalendarAction(null);
    setOrbState('thinking');
    
    let result;
    let error;
    try {
      if (action.type === 'create') result = await calendarClient.createEvent(action.data);
      if (action.type === 'update') result = await calendarClient.updateEvent(action.data);
      if (action.type === 'delete') await calendarClient.deleteEvent(action.data);
    } catch (err: any) {
      error = err.message;
    }

    const toolMsg: ChatMessage = {
      id: `tool-${Date.now()}`,
      role: 'user',
      content: '',
      functionResponse: { 
        name: action.functionName, 
        response: error ? { error } : { result: result || 'Success' } 
      }
    };
    
    const newMessages = [...messages, toolMsg];
    setMessages(newMessages);
    
    // Trigger follow-up AI turn so it can say "Added — Math test..."
    await triggerAiTurn(newMessages, messages, 'voice');
  }, [messages, pendingCalendarAction]);

  const cancelCalendarAction = useCallback(async () => {
    if (!pendingCalendarAction) return;
    const action = pendingCalendarAction;
    setPendingCalendarAction(null);
    setOrbState('thinking');

    const toolMsg: ChatMessage = {
      id: `tool-${Date.now()}`,
      role: 'user',
      content: '',
      functionResponse: { 
        name: action.functionName, 
        response: { error: 'User canceled the action. Ask if they want to change the details.' } 
      }
    };
    
    const newMessages = [...messages, toolMsg];
    setMessages(newMessages);
    await triggerAiTurn(newMessages, messages, 'voice');
  }, [messages, pendingCalendarAction]);

  const sendMessage = useCallback(
    async (text: string, inputMethod: 'voice' | 'text' = 'voice') => {
      const cleanText = text.trim();
      if (!cleanText) {
        setOrbState('idle');
        return;
      }

      // If user speaks while an action is pending, treat it as confirmation or revision
      if (pendingCalendarAction) {
        const lower = cleanText.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const confirmWords = ['yes', 'yep', 'yeah', 'do it', 'confirm', 'sure', 'sounds good', 'sound good', 'ok', 'okay', 'perfect', 'go ahead'];
        
        if (confirmWords.includes(lower)) {
          setTranscript(cleanText);
          await confirmCalendarAction();
          return;
        } else {
          setPendingCalendarAction(null);
          // We inject the cancel response AND the new user message
          const cancelMsg: ChatMessage = {
            id: `tool-${Date.now()}`,
            role: 'user',
            content: '',
            functionResponse: { 
              name: pendingCalendarAction.functionName, 
              response: { error: 'User ignored or rejected the confirmation. They provided new input.' } 
            }
          };
          const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: cleanText };
          const newMessages = [...messages, cancelMsg, userMsg];
          setMessages(newMessages);
          
          setTranscript(cleanText);
          setStreamingResponse('');
          setLastResponse('');
          
          await triggerAiTurn(newMessages, messages, inputMethod);
          return;
        }
      }

      setTranscript(cleanText);
      setStreamingResponse('');
      setLastResponse('');

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: cleanText,
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      await triggerAiTurn(newMessages, messages, inputMethod);
    },
    [messages, pendingCalendarAction, confirmCalendarAction]
  );

  const startListening = useCallback(() => {
    outputRef.current.cancel(); 
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
        pendingCalendarAction,
        startListening,
        stopListening,
        sendMessage,
        setIsTextMode,
        clearLastResponse,
        confirmCalendarAction,
        cancelCalendarAction,
      }}
    >
      {children}
    </VoiceCtx.Provider>
  );
}
