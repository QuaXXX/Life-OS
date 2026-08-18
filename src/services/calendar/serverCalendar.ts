import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import type { CalendarEvent, CreateEventInput, GetEventsOptions } from './types';

const TOKEN_FILE_PATH = path.resolve(process.cwd(), '.life-os-tokens.json');
const DEDICATED_CALENDAR_NAME = 'Life OS';

export interface StoredTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  calendar_id?: string;
}

export function loadStoredTokens(): StoredTokens | null {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const content = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Could not load token file:', err);
  }
  return null;
}

export function saveStoredTokens(tokens: Partial<StoredTokens>): void {
  try {
    const existing = loadStoredTokens() || {};
    const merged = { ...existing, ...tokens };
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save tokens to file:', err);
  }
}

export function clearStoredTokens(): void {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }
  } catch (err) {
    console.error('Failed to delete token file:', err);
  }
}

export function getOAuthClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getAuthenticatedCalendarClient(hostHeader?: string) {
  const tokens = loadStoredTokens();
  if (!tokens || !tokens.refresh_token) {
    throw new Error('Not connected to Google Calendar. Please sign in with Google.');
  }

  const redirectUri = getRedirectUriForHost(hostHeader);
  const oauth2Client = getOAuthClient(redirectUri);

  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
  });

  // Listen for auto-refreshed access tokens
  oauth2Client.on('tokens', (newTokens) => {
    saveStoredTokens({
      access_token: newTokens.access_token || undefined,
      refresh_token: newTokens.refresh_token || undefined,
      expiry_date: newTokens.expiry_date || undefined,
    });
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return { calendar, tokens };
}

export function getRedirectUriForHost(hostHeader?: string): string {
  if (hostHeader && hostHeader.includes('vercel.app')) {
    return 'https://life-os-azure-pi.vercel.app/api/auth/callback';
  }
  return 'http://localhost:5173/api/auth/callback';
}

/**
 * Finds or creates the dedicated "Life OS" calendar on the user's Google account.
 */
export async function getOrCreateDedicatedCalendarId(calendarApi: any): Promise<string> {
  const stored = loadStoredTokens();
  if (stored && stored.calendar_id) {
    return stored.calendar_id;
  }

  // 1. Search calendar list
  const listRes = await calendarApi.calendarList.list({ minAccessRole: 'writer' });
  const items = listRes.data.items || [];
  const existing = items.find((c: any) => c.summary === DEDICATED_CALENDAR_NAME);

  if (existing && existing.id) {
    saveStoredTokens({ calendar_id: existing.id });
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

  saveStoredTokens({ calendar_id: newId });
  return newId;
}

// ── CRUD Helpers ──

export async function fetchCalendarEvents(
  options: GetEventsOptions,
  hostHeader?: string
): Promise<CalendarEvent[]> {
  const { calendar } = await getAuthenticatedCalendarClient(hostHeader);
  const calendarId = await getOrCreateDedicatedCalendarId(calendar);

  const timeMin = new Date(`${options.startDate}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${options.endDate}T23:59:59Z`).toISOString();

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const items = res.data.items || [];
  return items.map(mapGoogleEventToCalendarEvent);
}

export async function createCalendarEvent(
  input: CreateEventInput,
  hostHeader?: string
): Promise<CalendarEvent> {
  const { calendar } = await getAuthenticatedCalendarClient(hostHeader);
  const calendarId = await getOrCreateDedicatedCalendarId(calendar);

  const startDateTime = `${input.date}T${input.startTime}:00`;
  const endDateTime = `${input.date}T${input.endTime}:00`;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: new Date(startDateTime).toISOString(), timeZone },
      end: { dateTime: new Date(endDateTime).toISOString(), timeZone },
    },
  });

  return mapGoogleEventToCalendarEvent(res.data);
}

export async function updateCalendarEvent(
  eventId: string,
  changes: Partial<CreateEventInput>,
  hostHeader?: string
): Promise<CalendarEvent> {
  const { calendar } = await getAuthenticatedCalendarClient(hostHeader);
  const calendarId = await getOrCreateDedicatedCalendarId(calendar);

  // Fetch existing event
  const existing = await calendar.events.get({ calendarId, eventId });
  const event = existing.data;

  const title = changes.title !== undefined ? changes.title : event.summary;
  const date = changes.date !== undefined ? changes.date : (event.start?.dateTime?.slice(0, 10) || '');
  const startTime = changes.startTime !== undefined ? changes.startTime : (event.start?.dateTime?.slice(11, 16) || '09:00');
  const endTime = changes.endTime !== undefined ? changes.endTime : (event.end?.dateTime?.slice(11, 16) || '10:00');

  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: title,
      description: changes.description !== undefined ? changes.description : event.description,
      location: changes.location !== undefined ? changes.location : event.location,
      start: { dateTime: new Date(startDateTime).toISOString(), timeZone },
      end: { dateTime: new Date(endDateTime).toISOString(), timeZone },
    },
  });

  return mapGoogleEventToCalendarEvent(res.data);
}

export async function deleteCalendarEvent(eventId: string, hostHeader?: string): Promise<void> {
  const { calendar } = await getAuthenticatedCalendarClient(hostHeader);
  const calendarId = await getOrCreateDedicatedCalendarId(calendar);

  await calendar.events.delete({ calendarId, eventId });
}

function mapGoogleEventToCalendarEvent(item: any): CalendarEvent {
  const startStr = item.start?.dateTime || item.start?.date || '';
  const endStr = item.end?.dateTime || item.end?.date || '';

  const date = startStr.slice(0, 10);
  const startTime = startStr.includes('T') ? startStr.slice(11, 16) : '00:00';
  const endTime = endStr.includes('T') ? endStr.slice(11, 16) : '23:59';

  return {
    id: item.id || '',
    title: item.summary || '(Untitled Event)',
    date,
    startTime,
    endTime,
    description: item.description || undefined,
    location: item.location || undefined,
    htmlLink: item.htmlLink || undefined,
  };
}
