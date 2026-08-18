import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { sensory } from '../../utils/sensory';
import type { OrbState } from './types';
import { WebSpeechInput } from './WebSpeechInput';
import { WebSpeechOutput } from './WebSpeechOutput';
import { chatService, type ChatMessage } from '../ai/ChatService';
import { calendarClient } from '../calendar/CalendarClient';
import { formatTime12h } from '../../pages/CalendarPage';

export type PendingCalendarAction = {
  messageId: string;
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
  confirmCalendarAction: (targetMessageId?: string) => Promise<void>;
  cancelCalendarAction: (targetMessageId?: string) => Promise<void>;
  selectChoice: (option: string, targetMessageId?: string) => Promise<void>;
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
  selectChoice: async () => {},
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

  // Guard against concurrent AI turns
  const aiTurnInProgress = useRef(false);

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

    // Find the last assistant message to attach inline interactive state if needed
    const lastIdx = newMessages.length - 1;
    const lastMsg = newMessages[lastIdx];

    for (const call of functionCalls) {
      const { name, args } = call;
      
      if (name === 'askChoice') {
        // Attach choice buttons directly to the assistant's message
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.choicePrompt = {
            question: args.question || 'Please select an option:',
            options: Array.isArray(args.options) ? args.options : [],
          };
        }
        
        // Acknowledge the tool call so history remains valid
        newMessages.push({
          id: `tool-${Date.now()}`,
          role: 'user',
          content: '',
          functionResponse: { name: 'askChoice', response: { status: 'choice_buttons_presented_to_user' } }
        });
        
        setMessages(newMessages);
        setOrbState('idle');
        return;
      } else if (name === 'getEvents') {
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
        // Intercept mutation for inline confirmation card
        let title = 'Confirm Event';
        let detailsText = '';
        if (name === 'createEvent') {
          title = 'Confirm Event';
          detailsText = `Add "${args.title}" on ${args.date} (${formatTime12h(args.startTime)} – ${formatTime12h(args.endTime)})?`;
        } else if (name === 'updateEvent') {
          title = 'Confirm Update';
          detailsText = `Update event to "${args.changes?.title || 'new details'}" on ${args.changes?.date || ''} (${formatTime12h(args.changes?.startTime)} – ${formatTime12h(args.changes?.endTime)})?`;
        } else if (name === 'deleteEvent') {
          title = 'Confirm Deletion';
          detailsText = `Delete this event from your calendar?`;
        }
        
        const actionType = name === 'createEvent' ? 'create' : name === 'updateEvent' ? 'update' : 'delete';

        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.pendingAction = {
            type: actionType,
            title,
            detailsText,
            data: args,
            functionName: name,
            status: 'pending',
          };
        }

        setPendingCalendarAction({
          messageId: lastMsg?.id || `msg-${Date.now()}`,
          type: actionType,
          title,
          detailsText,
          data: args,
          toolCallId: name,
          functionName: name
        });
        
        setMessages(newMessages);
        // FIX: Always go idle when showing a confirmation card.
        // The old code skipped setOrbState('idle') here, leaving it stuck in 'thinking',
        // which disabled the text input.
        setOrbState('idle');
        actionPending = true;
        break;
      } else {
        // CATCH-ALL: Unrecognized tool call (e.g. model tried to call "createReminder")
        // Push an error functionResponse so Gemini's history stays valid,
        // then let the model try again with a helpful error message.
        console.warn(`Unhandled tool call: ${name}`, args);
        newMessages.push({
          id: `tool-err-${Date.now()}`,
          role: 'user',
          content: '',
          functionResponse: { 
            name, 
            response: { 
              error: `The tool "${name}" is not available. Only these tools exist: getEvents, createEvent, updateEvent, deleteEvent, askChoice. If the user asked for a reminder or task, suggest adding it as a calendar event instead.` 
            } 
          }
        });
        needsAnotherTurn = true;
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
    // Prevent concurrent AI turns
    if (aiTurnInProgress.current) return;
    aiTurnInProgress.current = true;
    
    setOrbState('thinking');
    
    try {
      const { fullText, functionCalls, rawParts } = await chatService.streamChatWithRetry(
        currentMessages, 
        (_chunk, accumulated) => {
          setStreamingResponse(accumulated);
        },
        (statusMsg) => {
          setStreamingResponse(statusMsg);
        }
      );

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: fullText,
        ...(functionCalls.length > 0 && { functionCall: functionCalls[0] }),
        rawParts: rawParts && rawParts.length > 0 ? rawParts : undefined,
      };
      
      const newMessages = [...currentMessages, assistantMessage];
      setMessages(newMessages);
      
      if (fullText) {
        setLastResponse(fullText);
      }
      setStreamingResponse('');

      if (functionCalls.length > 0) {
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
      
      // Roll back to clean state on failure
      setMessages(originalMessages);
    } finally {
      aiTurnInProgress.current = false;
    }
  };

  const confirmCalendarAction = useCallback(async (targetMessageId?: string) => {
    if (!pendingCalendarAction) return;
    const action = pendingCalendarAction;
    setPendingCalendarAction(null);
    setOrbState('thinking');

    // Update message pendingAction status to 'confirmed'
    const updatedMessages = messages.map(m => {
      if (m.id === (targetMessageId || action.messageId) && m.pendingAction) {
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            status: 'confirmed' as const,
          }
        };
      }
      return m;
    });
    
    let result;
    let error;
    try {
      if (action.type === 'create') result = await calendarClient.createEvent(action.data);
      if (action.type === 'update') result = await calendarClient.updateEvent(action.data);
      if (action.type === 'delete') await calendarClient.deleteEvent(action.data);
      sensory.playActionSuccess();
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
    
    const newMessages = [...updatedMessages, toolMsg];
    setMessages(newMessages);
    
    await triggerAiTurn(newMessages, updatedMessages, 'voice');
  }, [messages, pendingCalendarAction]);

  const cancelCalendarAction = useCallback(async (targetMessageId?: string) => {
    if (!pendingCalendarAction) return;
    const action = pendingCalendarAction;
    setPendingCalendarAction(null);
    setOrbState('thinking');

    // Update message pendingAction status to 'cancelled'
    const updatedMessages = messages.map(m => {
      if (m.id === (targetMessageId || action.messageId) && m.pendingAction) {
        return {
          ...m,
          pendingAction: {
            ...m.pendingAction,
            status: 'cancelled' as const,
          }
        };
      }
      return m;
    });

    const toolMsg: ChatMessage = {
      id: `tool-${Date.now()}`,
      role: 'user',
      content: '',
      functionResponse: { 
        name: action.functionName, 
        response: { error: 'User canceled the action. Ask if they want to change the details.' } 
      }
    };
    
    const newMessages = [...updatedMessages, toolMsg];
    setMessages(newMessages);
    await triggerAiTurn(newMessages, updatedMessages, 'voice');
  }, [messages, pendingCalendarAction]);

  const selectChoice = useCallback(async (option: string, targetMessageId?: string) => {
    // Update message choicePrompt selected
    if (targetMessageId) {
      setMessages(prev => prev.map(m => {
        if (m.id === targetMessageId && m.choicePrompt) {
          return {
            ...m,
            choicePrompt: {
              ...m.choicePrompt,
              selected: option,
            }
          };
        }
        return m;
      }));
    }

    await sendMessage(option, 'text');
  }, []);

  const sendMessage = useCallback(
    async (text: string, inputMethod: 'voice' | 'text' = 'voice') => {
      const cleanText = text.trim();
      if (!cleanText) {
        setOrbState('idle');
        return;
      }

      // If user speaks while an action is pending, check for spoken confirmation
      if (pendingCalendarAction) {
        const lower = cleanText.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const confirmWords = ['yes', 'yep', 'yeah', 'do it', 'confirm', 'sure', 'sounds good', 'sound good', 'ok', 'okay', 'perfect', 'go ahead'];
        
        if (confirmWords.includes(lower)) {
          setTranscript(cleanText);
          await confirmCalendarAction();
          return;
        } else {
          setPendingCalendarAction(null);
          const cancelMsg: ChatMessage = {
            id: `tool-${Date.now()}`,
            role: 'user',
            content: '',
            functionResponse: { 
              name: pendingCalendarAction.functionName, 
              response: { error: 'User rejected the confirmation and provided new input.' } 
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
    sensory.playStartListening();
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
    sensory.playStopListening();
    // Immediately set a transitional state so the UI doesn't look stuck
    setOrbState('idle');
    
    let capturedText = '';
    if (inputRef.current.isSupported()) {
      capturedText = await inputRef.current.stop();
    }

    if (capturedText && capturedText.trim()) {
      await sendMessage(capturedText, 'voice');
    }
    // orbState is already 'idle' from above if no text was captured
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
        selectChoice,
      }}
    >
      {children}
    </VoiceCtx.Provider>
  );
}
