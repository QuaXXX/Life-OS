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

NATURAL LANGUAGE INTENT CLASSIFICATION RULES:
- REMINDERS & ALERTS: When the user asks for a reminder (e.g. "Remind me to call John at 4pm", "Set a reminder for laundry tomorrow at 10am", "Remind me to drink water in 1 hour", "Add reminder for doctor at 2pm"):
  -> ALWAYS call \`createEvent\` with \`title\` (e.g. "Reminder: Call John"), \`date\` (YYYY-MM-DD, default today if time given for today), \`startTime\` (HH:mm in 24h), \`endTime\` (15 mins after start), \`reminders: true\`, and \`colorId: '5'\` (Banana/Yellow) or \`colorId: '4'\` (Flamingo/Red).
  -> Provide a brief conversational confirmation (e.g. "I've set up your reminder for 4:00 PM:").
- EVENTS & COMMITMENTS: When the user asks to schedule or add an event, meeting, or workout (e.g. "Gym tomorrow at 5pm", "Team sync on Friday 2pm"):
  -> Call \`createEvent\` with \`title\`, \`date\`, \`startTime\`, \`endTime\`, \`colorId\` ('2' for workout, '3' for deep work, '1' for general).
- TASKS & TO-DOS: When the user asks to add a to-do or task (e.g. "Add task to clean car", "To-do: review document"):
  -> Call \`createEvent\` with \`colorId: '4'\` and \`startTime: "09:00"\` if adding to calendar, or call \`createTask\` for standalone to-do.

DATE & TIME CLARIFICATION / CONFIRMATION RULES:
1. When you are not confident about which specific day/date is meant, you MUST ask for clarification by calling the \`askChoice\` tool.
2. When the user asks to add/edit/delete an item and the details are clear, call the tool immediately. In your text response, provide a brief (1-sentence) conversational confirmation (e.g. "Here's the confirmation to add that to your calendar:").
3. Keep all responses direct, concise, and natural for voice synthesis.
4. Convert all times in tool parameters to 24-hour format (HH:mm, e.g. "14:00" for 2:00 PM). Always use 12-hour AM/PM formatting in your spoken/written text.
5. If the user asks general questions like "what's today's date?", respond directly using the REAL-TIME CURRENT DATE & TIME.

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Never mention being a generic AI model or language model; you are "Life OS".`;
}

const CALENDAR_TOOLS = [
  {
    name: 'askChoice',
    description: "Presents the user with explicit clickable choice buttons in the chat when a date, time, or option is ambiguous.",
    parameters: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING', description: "Casual, friendly question (e.g. 'Did you mean this Friday or next Friday?')" },
        options: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: "Array of 2-4 short options"
        }
      },
      required: ['question', 'options']
    }
  },
  {
    name: 'getEvents',
    description: "Fetches events from the user's Life OS calendar.",
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
    description: "Creates a new timed event or reminder on the user's Life OS calendar.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        date: { type: 'STRING', description: 'YYYY-MM-DD' },
        startTime: { type: 'STRING', description: 'HH:mm in 24h format' },
        endTime: { type: 'STRING', description: 'HH:mm in 24h format' },
        description: { type: 'STRING' },
        location: { type: 'STRING' },
        colorId: { type: 'STRING', description: 'String from "1" to "11"' },
        reminders: { type: 'BOOLEAN', description: 'True to add a popup reminder' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'updateEvent',
    description: "Updates an existing event on the user's Life OS calendar.",
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
            colorId: { type: 'STRING', description: 'String from "1" to "11"' },
            reminders: { type: 'BOOLEAN' },
          },
        },
      },
      required: ['eventId', 'changes'],
    },
  },
  {
    name: 'deleteEvent',
    description: "Deletes an event from the user's Life OS calendar.",
    parameters: {
      type: 'OBJECT',
      properties: {
        eventId: { type: 'STRING' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'clearCalendarDay',
    description: "Deletes ALL events for a specific day.",
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'YYYY-MM-DD to clear' },
      },
      required: ['date'],
    },
  },
  {
    name: 'createTask',
    description: "Creates a new actionable to-do item in Google Tasks.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Task title or action description' },
        notes: { type: 'STRING', description: 'Optional details or notes' },
        due: { type: 'STRING', description: 'Optional due date (YYYY-MM-DD)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'createDeadline',
    description: "Creates a hard deadline deliverable in Google Tasks with an exact due date.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Deadline deliverable title' },
        due: { type: 'STRING', description: 'Due date (YYYY-MM-DD)' },
        notes: { type: 'STRING', description: 'Optional deadline details' },
      },
      required: ['title', 'due'],
    },
  },
  {
    name: 'getTasks',
    description: "Fetches tasks or to-do items from Google Tasks.",
    parameters: {
      type: 'OBJECT',
      properties: {
        dueMin: { type: 'STRING', description: 'Optional YYYY-MM-DD start filter' },
        dueMax: { type: 'STRING', description: 'Optional YYYY-MM-DD end filter' },
        showCompleted: { type: 'BOOLEAN', description: 'Whether to include completed tasks' },
      },
    },
  },
  {
    name: 'completeTask',
    description: "Marks a task as completed in Google Tasks.",
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: { type: 'STRING', description: 'The ID of the task to mark completed' },
      },
      required: ['taskId'],
    },
  }
];

const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
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
