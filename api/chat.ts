declare const process: any;

export const config = {
  runtime: 'nodejs',
};

function getSystemInstruction() {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  return `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

CURRENT DATE & TIME:
The current date is ${now.toISOString().split('T')[0]}. The time is ${now.toTimeString().split(' ')[0]}.
The user's timezone is ${timeZone}.
Always use this as your reference point for relative dates (e.g. "tomorrow", "next Friday", "the 15th"). 

CALENDAR INTEGRATION:
You have access to the user's real Google Calendar via tools (getEvents, createEvent, updateEvent, deleteEvent).
- When a user provides ambiguous details (e.g. "add a study session sometime this week" with no day/time), ALWAYS ask a clarifying question rather than guessing.
- You can call multiple tools in one response if the user asks for multiple things.
- CRITICAL: When calling createEvent, updateEvent, or deleteEvent, you MUST also respond in plain language explaining what you are about to do (e.g., "I'll add 'Math test' on Saturday the 15th at 2:00 PM — sound right?"). The system will pause and ask the user for confirmation. Wait for the user to confirm. 
- You do NOT need confirmation to call getEvents (read-only).
- After an action is confirmed and succeeds (you receive the tool response), briefly confirm to the user (e.g. "Added — Math test, Saturday 2:00–3:00 PM").

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".`;
}

const CALENDAR_TOOLS = [
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
    const { messages = [] } = req.body || {};

    const rawContents = messages.map((m: any) => {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      
      // Pass previous function calls/responses through so model maintains context
      if (m.functionCall) parts.push({ functionCall: m.functionCall });
      if (m.functionResponse) parts.push({ functionResponse: m.functionResponse });

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
            systemInstruction: { parts: [{ text: getSystemInstruction() }] },
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
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line.includes('[DONE]')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const finishReason = candidate?.finishReason;
            
            if (finishReason && finishReason !== 'STOP') {
              console.warn('Gemini aborted generation with finishReason:', finishReason);
              res.write(`data: ${JSON.stringify({ error: `Model blocked or aborted generation (Reason: ${finishReason})` })}\n\n`);
              continue;
            }
            
            let text = '';
            let functionCalls = [];
            
            for (const part of parts) {
              if (part.text) text += part.text;
              if (part.functionCall) functionCalls.push(part.functionCall);
            }
            
            if (text || functionCalls.length > 0) {
              res.write(`data: ${JSON.stringify({ text, functionCalls })}\n\n`);
            }
          } catch {
            // Ignore parse errors on SSE frame boundaries
          }
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
