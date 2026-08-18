import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  parseCookies,
  getAuthenticatedCalendarClient,
  getRedirectUriForHost,
  getOrCreateDedicatedCalendarId
} from '../../src/services/calendar/serverCalendar';

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
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'startDate and endDate are required query parameters (YYYY-MM-DD)' });
        }
        const events = await fetchCalendarEvents({ startDate, endDate }, calendarApi, calendarId);
        return res.status(200).json({ events });
      }

      case 'POST': {
        const { title, date, startTime, endTime, description, location } = req.body || {};
        if (!title || !date || !startTime || !endTime) {
          return res.status(400).json({ error: 'title, date, startTime, and endTime are required' });
        }
        const newEvent = await createCalendarEvent({ title, date, startTime, endTime, description, location }, calendarApi, calendarId);
        return res.status(201).json({ event: newEvent });
      }

      case 'PUT': {
        const { eventId, changes } = req.body || {};
        if (!eventId || !changes) {
          return res.status(400).json({ error: 'eventId and changes are required' });
        }
        const updated = await updateCalendarEvent(eventId, changes, calendarApi, calendarId);
        return res.status(200).json({ event: updated });
      }

      case 'DELETE': {
        const eventId = req.query.eventId || req.body?.eventId;
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required' });
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
