import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import authGoogleHandler from './api/auth/google.ts'
import authCallbackHandler from './api/auth/callback.ts'
import authStatusHandler from './api/auth/status.ts'
import authLogoutHandler from './api/auth/logout.ts'
import calendarEventsHandler from './api/calendar/events.ts'
import tasksHandler from './api/tasks.ts'

const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

const SYSTEM_INSTRUCTION = `You are Life OS, an intelligent, personal "second brain" and productivity companion.
Your purpose is to help the user manage their daily life, schedule, workouts, nutrition, and personal goals.

Key personality traits:
- Direct, concise, and natural in spoken conversation.
- Supportive, proactive, and focused on helping the user stay organized and consistent.
- Keep responses relatively brief (1-3 sentences) unless the user asks for deep detail, so answers flow naturally when spoken aloud via voice.
- Never mention being a generic AI model or language model; you are "Life OS".`;

function wrapHandler(handler: (req: any, res: any) => Promise<any> | any) {
  return async (req: any, res: any) => {
    if (!res.status) {
      res.status = function (code: number) {
        this.statusCode = code;
        return this;
      };
    }
    if (!res.json) {
      res.json = function (data: any) {
        if (!this.getHeader('Content-Type')) {
          this.setHeader('Content-Type', 'application/json');
        }
        this.end(JSON.stringify(data));
        return this;
      };
    }
    if (!res.redirect) {
      res.redirect = function (statusOrUrl: any, url?: string) {
        let code = 302;
        let dest = statusOrUrl;
        if (typeof url === 'string') {
          code = statusOrUrl;
          dest = url;
        }
        this.writeHead(code, { Location: dest });
        this.end();
        return this;
      };
    }

    const host = req.headers.host || 'localhost:5173';
    const url = new URL(req.url || '', `http://${host}`);
    req.query = Object.fromEntries(url.searchParams);

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
      let bodyStr = '';
      req.on('data', (chunk: any) => {
        bodyStr += chunk;
      });
      req.on('end', async () => {
        try {
          req.body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          req.body = {};
        }
        await handler(req, res);
      });
    } else {
      await handler(req, res);
    }
  };
}

function devApiPlugin(): Plugin {
  let env: Record<string, string> = {};

  return {
    name: 'dev-api-plugin',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '');
      process.env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
      process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    },
    configureServer(server) {
      // 1. Google OAuth Auth endpoints
      server.middlewares.use('/api/auth/google', wrapHandler(authGoogleHandler));
      server.middlewares.use('/api/auth/callback', wrapHandler(authCallbackHandler));
      server.middlewares.use('/api/auth/status', wrapHandler(authStatusHandler));
      server.middlewares.use('/api/auth/logout', wrapHandler(authLogoutHandler));

      // 2. Calendar CRUD endpoints
      server.middlewares.use('/api/calendar/events', wrapHandler(calendarEventsHandler));

      // 3. Tasks CRUD endpoints
      server.middlewares.use('/api/tasks', wrapHandler(tasksHandler));

      // 4. Conversational AI Chat endpoint
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
        req.on('data', (chunk: any) => {
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
                const controller = new AbortController();
                const modelTimeout = setTimeout(() => controller.abort(), 8000);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
                const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                    generationConfig: { temperature: 0.7 },
                  }),
                  signal: controller.signal,
                });

                clearTimeout(modelTimeout);

                if (response.ok && response.body) {
                  console.log(`[Life OS] Using model: ${model}`);
                  upstreamRes = response;
                  break;
                } else {
                  lastErrorText = await response.text().catch(() => `Status ${response.status}`);
                  console.warn(`Model ${model} returned error:`, lastErrorText.slice(0, 120));
                }
              } catch (err: any) {
                lastErrorText = err.message || 'Fetch failed';
                console.warn(`Model ${model} failed:`, lastErrorText);
              }
            }

            if (!upstreamRes || !upstreamRes.body) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `All models busy. Try again in a moment.` }));
              return;
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');

            const reader = upstreamRes.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });

              const frames = sseBuffer.split('\n');
              sseBuffer = '';

              for (const line of frames) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;

                const payload = trimmed.slice(5).trim();
                if (!payload) continue;

                try {
                  const data = JSON.parse(payload);
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    res.write(`data: ${JSON.stringify({ text })}\n\n`);
                  }
                } catch {
                  // partial JSON across chunk boundary
                }
              }
            }

            res.write('data: [DONE]\n\n');
            res.end();
          } catch (err: any) {
            console.error('Vite dev /api/chat error:', err);
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

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
