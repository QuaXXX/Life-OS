import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
];

const SYSTEM_INSTRUCTION = `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".`;

function devApiChatPlugin(): Plugin {
  let env: Record<string, string> = {};

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

            const contents = messages.map((m: { role: string; content: string }) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));

            if (contents.length === 0) {
              contents.push({ role: 'user', parts: [{ text: 'Hello!' }] });
            }

            let upstreamRes: Response | null = null;
            let lastErrorText = '';

            for (const model of CANDIDATE_MODELS) {
              try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
                const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                    generationConfig: { temperature: 0.7 },
                  }),
                });

                if (response.ok && response.body) {
                  upstreamRes = response;
                  break;
                } else {
                  lastErrorText = await response.text().catch(() => `Status ${response.status}`);
                  console.warn(`Model ${model} returned error:`, lastErrorText);
                }
              } catch (err: any) {
                lastErrorText = err.message || 'Fetch failed';
              }
            }

            if (!upstreamRes || !upstreamRes.body) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `All Gemini models failed: ${lastErrorText}` }));
              return;
            }

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
                  try {
                    const data = JSON.parse(line.slice(6));
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      res.write(`data: ${JSON.stringify({ text })}\n\n`);
                    }
                  } catch {
                    // Ignore parse errors on chunk boundaries
                  }
                }
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
