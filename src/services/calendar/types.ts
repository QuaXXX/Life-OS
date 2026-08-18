export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  description?: string;
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

export interface CreateEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  timeZone?: string;
  colorId?: string;
  reminders?: boolean; // simple boolean to enable/disable a popup reminder
}

export interface UpdateEventInput {
  eventId: string;
  changes: Partial<CreateEventInput>;
  timeZone?: string;
}

export interface GetEventsOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timeZone?: string;
}

export interface AuthStatus {
  connected: boolean;
  calendarName?: string;
  calendarId?: string;
}
