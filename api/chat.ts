declare const process: any;

export const config = {
  runtime: 'nodejs',
};

function getSystemInstruction(clientContext?: any) {
  const now = new Date();
  const dateStr = clientContext?.date || now.toISOString().split('T')[0];
  const dayOfWeek = clientContext?.dayOfWeek || new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  const timeStr = clientContext?.time || now.toLocaleTimeString();
  const timeZone = clientContext?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

REAL-TIME CURRENT DATE & TIME (SOURCE OF TRUTH):
- Today is: ${dayOfWeek}, ${dateStr}
- Current local time: ${timeStr}
- User's Timezone: ${timeZone}
Always use this exact reference point for any relative date calculation (e.g. "today", "tomorrow", "this Friday", "next week").

DATE & TIME CLARIFICATION / CONFIRMATION RULES:
1. When you are not confident about which specific day/date is meant (e.g. user says "this Friday" when it is already Friday, or "gym next week", or "add lunch on the 15th" when the month is ambiguous), you MUST ask for clarification by calling the \`askChoice\` tool. Provide a short, casual question and the specific candidate date options (e.g. options: ["Fri, Aug 21", "Fri, Aug 28"]).
2. When the user asks to add/edit/delete an event and the date/time is clear or reasonably inferred, call \`createEvent\`, \`updateEvent\`, or \`deleteEvent\`. In your plain-language message, briefly state what you're proposing (e.g. "I'll add 'Math test' on Saturday at 2:00 PM."). The UI will automatically attach interactive inline Confirm and Cancel buttons inside your chat message.
3. Keep all questions and text short, everyday, and conversational (e.g. "Did you mean 7:00 AM or 7:00 PM?"). Never write robotic, long explanations.
4. Convert all times in tool parameters to 24-hour format (HH:mm, e.g. "14:00" for 2:00 PM). Always use 12-hour AM/PM formatting in your spoken/written text (e.g. "2:00 PM").
5. If the user asks general questions like "what's today's date?" or "what day is it?", respond directly using the REAL-TIME CURRENT DATE & TIME source of truth.

CALENDAR INTEGRATION:
You have access to the user's real Google Calendar via tools (getEvents, createEvent, updateEvent, deleteEvent, askChoice).
- You do NOT need confirmation to call getEvents (read-only).
- After an action succeeds, confirm simply in plain speech (e.g. "Added — Math test on Saturday at 2:00 PM").

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".

IMPORTANT LIMITATION (NO REMINDERS/TASKS):
- You DO NOT have the ability to set reminders or create standalone tasks.
- If the user asks you to "remind me to X" or "create a task for Y", tell them you don't support reminders/tasks, and offer to add it to their calendar as an event instead.`;
}

const CALENDAR_TOOLS = [
  {
    name: 'askChoice',
    description: "Presents the user with explicit clickable choice buttons in the chat when a date, time, or option is ambiguous. Use this whenever you need the user to choose between 2 or more dates/times/options.",
    parameters: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING', description: "Casual, friendly question (e.g. 'Did you mean this Friday or next Friday?')" },
        options: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: "Array of 2-4 short, clear options (e.g. ['Fri, Aug 21', 'Fri, Aug 28'] or ['7:00 AM', '7:00 PM'])"
        }
      },
      required: ['question', 'options']
    }
  },
  {
    name: 'getEvents',
    description: "Fetches events from the user's Life OS calendar. Use this when the user asks what's on their schedule.",
    parameters: {
      type: 'OBJECT',
      properties: {
        startDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        endDate: { type: 'STRING', description: 'YYYY-MM-DD' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'createEvent',
    description: "Creates a new event on the user's Life OS calendar. Use this when the user asks to add, schedule, or book something.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        date: { type: 'STRING', description: 'YYYY-MM-DD' },
        startTime: { type: 'STRING', description: 'HH:mm in 24h format' },
        endTime: { type: 'STRING', description: 'HH:mm in 24h format' },
        description: { type: 'STRING' },
        location: { type: 'STRING' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'updateEvent',
    description: "Updates an existing event on the user's Life OS calendar. Use this when the user asks to change, move, or edit an event.",
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING' },
        changes: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            date: { type: 'STRING', description: 'YYYY-MM-DD' },
            startTime: { type: 'STRING', description: 'HH:mm in 24h format' },
            endTime: { type: 'STRING', description: 'HH:mm in 24h format' },
            description: { type: 'STRING' },
          },
        },
      },
      required: ['eventId', 'changes'],
    },
  },
  {
    name: 'deleteEvent',
    description: "Deletes an event from the user's Life OS calendar. Use this when the user asks to remove or cancel an event.",
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING' },
      },
      required: ['eventId'],
    },
  }
];

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured' });
  }

  try {
    const { messages = [], clientContext } = req.body || {};

    let trimmedMessages = messages.slice(-20);
    if (messages.length > 20) {
      while (trimmedMessages.length > 0) {
        if (trimmedMessages[0].functionResponse) {
          const firstTrimmedIndex = messages.length - trimmedMessages.length;
          if (firstTrimmedIndex > 0) {
            trimmedMessages.unshift(messages[firstTrimmedIndex - 1]);
            continue;
          }
        }
        break;
      }
      while (trimmedMessages.length > 0 && trimmedMessages[0].role === 'assistant') {
        trimmedMessages.shift();
      }
    }

    const lastAssistantIdx = trimmedMessages.map((m: any) => m.role).lastIndexOf('assistant');

    const rawContents = trimmedMessages.map((m: any, idx: number) => {
      const keepRawParts = m.role === 'assistant' && idx === lastAssistantIdx;

      // If exact raw parts from Gemini exist for the model turn, preserve them verbatim!
      if (keepRawParts && Array.isArray(m.rawParts) && m.rawParts.length > 0) {
        return {
          role: 'model',
          parts: m.rawParts,
        };
      }

      const parts = [];
      if (m.content) parts.push({ text: m.content });
      
      // Fallback manual part assembly
      if (m.functionCall) {
        const part: any = {
          functionCall: {
            name: m.functionCall.name,
            args: m.functionCall.args,
          }
        };
        const sig = m.functionCall.thoughtSignature || m.functionCall.thought_signature || m.thoughtSignature || m.thought_signature;
        if (sig) {
          part.thoughtSignature = sig;
        }
        parts.push(part);
      }
      
      if (m.functionResponse) {
        parts.push({ functionResponse: m.functionResponse });
      }

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    // Gemini strictly requires alternating roles (user, model, user, model).
    // Collapse consecutive messages from the same role into a single message with multiple parts.
    const contents: any[] = [];
    for (const c of rawContents) {
      if (contents.length > 0 && contents[contents.length - 1].role === c.role) {
        contents[contents.length - 1].parts.push(...c.parts);
      } else {
        contents.push(c);
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello!' }] });
    }

    let upstreamRes: Response | null = null;
    let accumulatedErrors: string[] = [];

    for (const model of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            tools: [{ functionDeclarations: CALENDAR_TOOLS }],
            systemInstruction: { parts: [{ text: getSystemInstruction(clientContext) }] },
            generationConfig: { temperature: 0.7 },
          }),
        });

        if (response.ok && response.body) {
          upstreamRes = response;
          break;
        } else {
          const errText = await response.text().catch(() => `Status ${response.status}`);
          console.warn(`Model ${model} returned error:`, errText);
          accumulatedErrors.push(`${model}: ${response.status} - ${errText}`);
          
          // If it's a 400 Bad Request, trying another model won't fix the payload. Stop.
          if (response.status === 400) {
            break;
          }
        }
      } catch (err: any) {
        accumulatedErrors.push(`${model}: Fetch failed - ${err.message}`);
      }
    }

    if (!upstreamRes || !upstreamRes.body) {
      return res.status(502).json({ error: `All Gemini models failed:\n${accumulatedErrors.join('\n')}` });
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        if (trimmed.includes('[DONE]')) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          
          if (data.error) {
            console.error('Gemini API stream returned error payload:', data.error);
            res.write(`data: ${JSON.stringify({ error: `Gemini API Error: ${data.error.message || JSON.stringify(data.error)} (Code: ${data.error.code || 'unknown'})` })}\n\n`);
            continue;
          }

          const candidate = data.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const finishReason = candidate?.finishReason;
          
          if (finishReason && finishReason !== 'STOP') {
            console.warn('Gemini aborted generation with finishReason:', finishReason);
            res.write(`data: ${JSON.stringify({ error: `Generation stopped by model (finishReason: ${finishReason})` })}\n\n`);
            continue;
          }
          
          let text = '';
          let functionCalls = [];
          
          for (const part of parts) {
            if (part.text) text += part.text;
            if (part.functionCall) {
              const callObj: any = { ...part.functionCall };
              if (part.thoughtSignature) callObj.thoughtSignature = part.thoughtSignature;
              if (part.thought_signature) callObj.thoughtSignature = part.thought_signature;
              functionCalls.push(callObj);
            }
          }
          
          if (text || functionCalls.length > 0 || parts.length > 0) {
            res.write(`data: ${JSON.stringify({ text, functionCalls, rawParts: parts })}\n\n`);
          }
        } catch (parseErr: any) {
          console.warn('Failed to parse SSE frame:', trimmed.slice(0, 100), parseErr.message);
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error in /api/chat handler:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Failed to generate response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
      res.end();
    }
  }
}
