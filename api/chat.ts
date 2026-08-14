import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'nodejs',
};

const SYSTEM_INSTRUCTION = `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".`;

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
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

    const ai = new GoogleGenAI({ apiKey });

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    let responseStream = null;
    let lastError = null;

    // Try candidate models with fallback
    for (const model of CANDIDATE_MODELS) {
      try {
        responseStream = await ai.models.generateContentStream({
          model,
          contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello!' }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        break; // Successfully started stream
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next candidate...`);
      }
    }

    if (!responseStream) {
      throw lastError || new Error('All model candidates failed');
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
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
