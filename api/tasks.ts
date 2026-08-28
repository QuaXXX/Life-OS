import {
  parseCookies,
  getAuthenticatedTasksClient,
  getRedirectUriForHost,
} from '../src/services/calendar/serverCalendar.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:5173';
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies['life_os_refresh_token'];

  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized: No refresh token found. Please sign in with Google.' });
  }

  try {
    const redirectUri = getRedirectUriForHost(host);
    const tasksApi = await getAuthenticatedTasksClient(refreshToken, redirectUri);

    switch (req.method) {
      case 'GET': {
        const { dueMin, dueMax, showCompleted } = req.query || {};
        
        const params: any = {
          tasklist: '@default',
          showCompleted: showCompleted === 'true',
          showHidden: false,
          maxResults: 100,
        };

        if (dueMin) {
          params.dueMin = new Date(dueMin + 'T00:00:00Z').toISOString();
        }
        if (dueMax) {
          params.dueMax = new Date(dueMax + 'T23:59:59Z').toISOString();
        }

        const listRes = await tasksApi.tasks.list(params);
        const rawItems = listRes.data.items || [];

        const tasks = rawItems.map((item: any) => ({
          id: item.id || '',
          title: item.title || '(Untitled Task)',
          notes: item.notes || undefined,
          due: item.due || undefined,
          status: item.status || 'needsAction',
          completed: item.completed || undefined,
          position: item.position || undefined,
          updated: item.updated || undefined,
        }));

        return res.status(200).json({ tasks });
      }

      case 'POST': {
        const { title, notes, due } = req.body || {};
        if (!title) {
          return res.status(400).json({ error: 'title is required to create a task' });
        }

        const taskBody: any = {
          title,
          notes,
        };

        if (due) {
          // Format as RFC 3339 timestamp (e.g. 2026-08-28T00:00:00.000Z)
          taskBody.due = due.includes('T') ? new Date(due).toISOString() : new Date(`${due}T00:00:00.000Z`).toISOString();
        }

        const createRes = await tasksApi.tasks.insert({
          tasklist: '@default',
          requestBody: taskBody,
        });

        const item = createRes.data;
        const task = {
          id: item.id || '',
          title: item.title || title,
          notes: item.notes || notes,
          due: item.due || undefined,
          status: item.status || 'needsAction',
          completed: item.completed || undefined,
        };

        return res.status(201).json({ task });
      }

      case 'PUT': {
        const { taskId, title, notes, due, status } = req.body || {};
        if (!taskId) {
          return res.status(400).json({ error: 'taskId is required to update a task' });
        }

        // Fetch existing task
        const existing = await tasksApi.tasks.get({
          tasklist: '@default',
          task: taskId,
        });

        const patchBody: any = {
          ...existing.data,
        };

        if (title !== undefined) patchBody.title = title;
        if (notes !== undefined) patchBody.notes = notes;
        if (status !== undefined) patchBody.status = status;
        if (due !== undefined) {
          patchBody.due = due ? (due.includes('T') ? new Date(due).toISOString() : new Date(`${due}T00:00:00.000Z`).toISOString()) : null;
        }

        const updateRes = await tasksApi.tasks.update({
          tasklist: '@default',
          task: taskId,
          requestBody: patchBody,
        });

        const item = updateRes.data;
        const task = {
          id: item.id || taskId,
          title: item.title || '',
          notes: item.notes || undefined,
          due: item.due || undefined,
          status: item.status || 'needsAction',
          completed: item.completed || undefined,
        };

        return res.status(200).json({ task });
      }

      case 'DELETE': {
        const taskId = req.query.taskId || req.body?.taskId;
        if (!taskId) {
          return res.status(400).json({ error: 'taskId is required' });
        }

        await tasksApi.tasks.delete({
          tasklist: '@default',
          task: taskId,
        });

        return res.status(200).json({ success: true, taskId });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.error(`Tasks API ${req.method} Error:`, err);
    return res.status(500).json({ error: err.message || 'Tasks server error' });
  }
}
