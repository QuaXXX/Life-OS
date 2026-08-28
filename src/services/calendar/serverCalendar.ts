import { google } from 'googleapis';
import type { CalendarEvent, CreateEventInput, GetEventsOptions } from './types.js';

const DEDICATED_CALENDAR_NAME = 'Life OS';

export function getOAuthClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getAuthenticatedCalendarClient(refreshToken: string, redirectUri: string) {
  if (!refreshToken) {
    throw new Error('Not connected to Google Calendar. Please sign in with Google.');
  }

  const oauth2Client = getOAuthClient(redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return calendar;
}

export async function getAuthenticatedTasksClient(refreshToken: string, redirectUri: string) {
  if (!refreshToken) {
    throw new Error('Not connected to Google Account. Please sign in with Google.');
  }

  const oauth2Client = getOAuthClient(redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const tasks = google.tasks({ version: 'v1', auth: oauth2Client });
  return tasks;
}

export function getRedirectUriForHost(hostHeader?: string): string {
  if (hostHeader && hostHeader.includes('vercel.app')) {
    return `https://${hostHeader}/api/auth/callback`;
  }
  return 'http://localhost:5173/api/auth/callback';
}

/**
 * Finds or creates the dedicated "Life OS" calendar on the user's Google account.
 */
export async function getOrCreateDedicatedCalendarId(calendarApi: any, existingId?: string): Promise<string> {
  if (existingId) return existingId;

  // 1. Search calendar list
  const listRes = await calendarApi.calendarList.list({ minAccessRole: 'writer' });
  const items = listRes.data.items || [];
  const existing = items.find((c: any) => c.summary === DEDICATED_CALENDAR_NAME);

  if (existing && existing.id) {
    return existing.id;
  }

  // 2. Create new secondary calendar
  const createRes = await calendarApi.calendars.insert({
    requestBody: {
      summary: DEDICATED_CALENDAR_NAME,
      description: 'Dedicated personal calendar managed by Life OS',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });

  const newId = createRes.data.id;
  if (!newId) {
    throw new Error('Failed to create dedicated Life OS calendar');
  }

  return newId;
}

// ── CRUD Helpers ──

export async function fetchCalendarEvents(
  options: GetEventsOptions,
  calendarApi: any,
  calendarId: string
): Promise<CalendarEvent[]> {
  const timeZone = options.timeZone || 'UTC';
  
  // Safe buffer window to cover user's local day in any timezone
  const minDate = new Date(`${options.startDate}T00:00:00Z`);
  minDate.setHours(minDate.getHours() - 14);
  const maxDate = new Date(`${options.endDate}T23:59:59Z`);
  maxDate.setHours(maxDate.getHours() + 14);

  const res = await calendarApi.events.list({
    calendarId,
    timeMin: minDate.toISOString(),
    timeMax: maxDate.toISOString(),
    singleEvents: true,
    timeZone,
    orderBy: 'startTime',
  });

  const items = res.data.items || [];
  return items.map((item: any) => mapGoogleEventToCalendarEvent(item));
}

export async function createCalendarEvent(
  input: CreateEventInput,
  calendarApi: any,
  calendarId: string
): Promise<CalendarEvent> {
  const timeZone = input.timeZone || 'UTC';
  const startDateTime = `${input.date}T${input.startTime}:00`;
  const endDateTime = `${input.date}T${input.endTime}:00`;

  let remindersConfig = undefined;
  if (input.reminders === true) {
    remindersConfig = { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }, { method: 'popup', minutes: 10 }] };
  } else if (input.reminders === false) {
    remindersConfig = { useDefault: false, overrides: [] };
  }

  const res = await calendarApi.events.insert({
    calendarId,
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      colorId: input.colorId,
      reminders: remindersConfig,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    },
  });

  return mapGoogleEventToCalendarEvent(res.data);
}

export async function updateCalendarEvent(
  eventId: string,
  changes: Partial<CreateEventInput> & { timeZone?: string },
  calendarApi: any,
  calendarId: string
): Promise<CalendarEvent> {
  // Fetch existing event
  const existing = await calendarApi.events.get({ calendarId, eventId });
  const event = existing.data;

  const timeZone = changes.timeZone || event.start?.timeZone || 'UTC';
  const title = changes.title !== undefined ? changes.title : event.summary;
  const date = changes.date !== undefined ? changes.date : (event.start?.dateTime?.slice(0, 10) || event.start?.date || '');
  const startTime = changes.startTime !== undefined ? changes.startTime : (event.start?.dateTime?.slice(11, 16) || '09:00');
  const endTime = changes.endTime !== undefined ? changes.endTime : (event.end?.dateTime?.slice(11, 16) || '10:00');

  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  let remindersConfig = event.reminders;
  if (changes.reminders === true) {
    remindersConfig = { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] };
  } else if (changes.reminders === false) {
    remindersConfig = { useDefault: false, overrides: [] };
  }

  const res = await calendarApi.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: title,
      description: changes.description !== undefined ? changes.description : event.description,
      location: changes.location !== undefined ? changes.location : event.location,
      colorId: changes.colorId !== undefined ? changes.colorId : event.colorId,
      reminders: remindersConfig,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    },
  });

  return mapGoogleEventToCalendarEvent(res.data);
}

export async function deleteCalendarEvent(
  eventId: string,
  calendarApi: any,
  calendarId: string
): Promise<void> {
  await calendarApi.events.delete({ calendarId, eventId });
}

function mapGoogleEventToCalendarEvent(item: any): CalendarEvent {
  const startStr = item.start?.dateTime || item.start?.date || '';
  const endStr = item.end?.dateTime || item.end?.date || '';

  const date = startStr.slice(0, 10);
  const startTime = startStr.includes('T') ? startStr.slice(11, 16) : '00:00';
  const endTime = endStr.includes('T') ? endStr.includes('T') ? endStr.slice(11, 16) : '23:59' : '23:59';

  return {
    id: item.id || '',
    title: item.summary || '(Untitled Event)',
    date,
    startTime,
    endTime,
    description: item.description || undefined,
    location: item.location || undefined,
    htmlLink: item.htmlLink || undefined,
    colorId: item.colorId || undefined,
  };
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURI(parts.join('='));
    }
  });
  return list;
}
