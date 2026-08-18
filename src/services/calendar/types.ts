export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  description?: string;
  location?: string;
  htmlLink?: string;
}

export interface CreateEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
}

export interface UpdateEventInput {
  eventId: string;
  changes: Partial<CreateEventInput>;
}

export interface GetEventsOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface AuthStatus {
  connected: boolean;
  calendarName?: string;
  calendarId?: string;
}
