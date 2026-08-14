import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GoogleGenAI } from '@google/genai'

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
];

function devApiChatPlugin(): Plugin {
  let env: Record<string, string> = {};

  const SYSTEM_INSTRUCTION = `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".`;

  return {
    name: 'dev-api-chat',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '');
    },
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set in .env.local' }));
          return;
        }

        let bodyStr = '';
        req.on('data', (chunk) => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const { messages = [] } = body;

            const ai = new GoogleGenAI({ apiKey });

            const contents = messages.map((m: { role: string; content: string }) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');

            let responseStream = null;
            let lastError = null;

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
                break;
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
          } catch (err: any) {
            console.error('Vite dev server /api/chat error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Stream error' }));
            } else {
              res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
              res.end();
            }
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiChatPlugin()],
})
