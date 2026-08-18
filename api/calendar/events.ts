import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../../src/services/calendar/serverCalendar';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const host = req.headers.host;

  try {
    switch (req.method) {
      case 'GET': {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'startDate and endDate are required query parameters (YYYY-MM-DD)' });
        }
        const events = await fetchCalendarEvents({ startDate, endDate }, host);
        return res.status(200).json({ events });
      }

      case 'POST': {
        const { title, date, startTime, endTime, description, location } = req.body || {};
        if (!title || !date || !startTime || !endTime) {
          return res.status(400).json({ error: 'title, date, startTime, and endTime are required' });
        }
        const newEvent = await createCalendarEvent({ title, date, startTime, endTime, description, location }, host);
        return res.status(201).json({ event: newEvent });
      }

      case 'PUT': {
        const { eventId, changes } = req.body || {};
        if (!eventId || !changes) {
          return res.status(400).json({ error: 'eventId and changes are required' });
        }
        const updated = await updateCalendarEvent(eventId, changes, host);
        return res.status(200).json({ event: updated });
      }

      case 'DELETE': {
        const eventId = req.query.eventId || req.body?.eventId;
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required' });
        }
        await deleteCalendarEvent(eventId, host);
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
