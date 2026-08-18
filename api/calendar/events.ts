import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  parseCookies,
  getAuthenticatedCalendarClient,
  getRedirectUriForHost,
  getOrCreateDedicatedCalendarId
} from '../../src/services/calendar/serverCalendar.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:5173';
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies['life_os_refresh_token'];
  let calendarId = cookies['life_os_calendar_id'];

  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized: No refresh token cookie found' });
  }

  try {
    const redirectUri = getRedirectUriForHost(host);
    const calendarApi = await getAuthenticatedCalendarClient(refreshToken, redirectUri);
    
    // In case cookie didn't save the calendar ID, fallback to finding it
    calendarId = await getOrCreateDedicatedCalendarId(calendarApi, calendarId);

    switch (req.method) {
      case 'GET': {
        const { startDate, endDate, timeZone } = req.query;
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'startDate and endDate are required query parameters (YYYY-MM-DD)' });
        }
        const events = await fetchCalendarEvents({ startDate, endDate, timeZone }, calendarApi, calendarId);
        return res.status(200).json({ events });
      }

      case 'POST': {
        const { title, date, startTime, endTime, description, location, timeZone, colorId, reminders } = req.body || {};
        if (!title || !date || !startTime || !endTime) {
          return res.status(400).json({ error: 'title, date, startTime, and endTime are required' });
        }
        const newEvent = await createCalendarEvent({ title, date, startTime, endTime, description, location, timeZone, colorId, reminders }, calendarApi, calendarId);
        return res.status(201).json({ event: newEvent });
      }

      case 'PUT': {
        const { eventId, changes, timeZone } = req.body || {};
        if (!eventId || !changes) {
          return res.status(400).json({ error: 'eventId and changes are required' });
        }
        const updated = await updateCalendarEvent(eventId, { ...changes, timeZone }, calendarApi, calendarId);
        return res.status(200).json({ event: updated });
      }

      case 'DELETE': {
        const eventId = req.query.eventId || req.body?.eventId;
        const clearDate = req.query.clearDate || req.body?.clearDate;
        const timeZone = req.query.timeZone || req.body?.timeZone || 'UTC';
        
        if (clearDate) {
          const dayEvents = await fetchCalendarEvents({ startDate: clearDate, endDate: clearDate, timeZone }, calendarApi, calendarId);
          for (const ev of dayEvents) {
            if (ev.id) {
              await deleteCalendarEvent(ev.id, calendarApi, calendarId);
            }
          }
          return res.status(200).json({ success: true, clearedDate: clearDate, count: dayEvents.length });
        }
        
        if (!eventId) {
          return res.status(400).json({ error: 'eventId or clearDate is required' });
        }
        await deleteCalendarEvent(eventId, calendarApi, calendarId);
        return res.status(200).json({ success: true, eventId });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.error(`Calendar API ${req.method} Error:`, err);
    return res.status(500).json({ error: err.message || 'Calendar server error' });
  }
}
