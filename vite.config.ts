import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import authGoogleHandler from './api/auth/google.ts'
import authCallbackHandler from './api/auth/callback.ts'
import authStatusHandler from './api/auth/status.ts'
import authLogoutHandler from './api/auth/logout.ts'
import calendarEventsHandler from './api/calendar/events.ts'
import tasksHandler from './api/tasks.ts'
import chatHandler from './api/chat.ts'

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
  return {
    name: 'dev-api-plugin',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '');
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

      // 4. Conversational AI Chat endpoint (with full tool calling & SSE)
      server.middlewares.use('/api/chat', wrapHandler(chatHandler));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
