import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  GetEventsOptions,
  AuthStatus,
} from './types';

export class CalendarClient {
  async getStatus(): Promise<AuthStatus> {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) return { connected: false };
      return await res.json();
    } catch {
      return { connected: false };
    }
  }

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  }

  /**
   * Fetch calendar events for a given date range (YYYY-MM-DD)
   */
  async getEvents(options: GetEventsOptions): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      startDate: options.startDate,
      endDate: options.endDate,
    });
    const res = await fetch(`/api/calendar/events?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch calendar events');
    }
    const data = await res.json();
    return data.events || [];
  }

  /**
   * Create a new event in the dedicated Life OS Google Calendar
   */
  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create calendar event');
    }
    const data = await res.json();
    return data.event;
  }

  /**
   * Update an existing event in the dedicated Life OS Google Calendar
   */
  async updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    const res = await fetch('/api/calendar/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update calendar event');
    }
    const data = await res.json();
    return data.event;
  }

  /**
   * Delete an event from the dedicated Life OS Google Calendar
   */
  async deleteEvent({ eventId }: { eventId: string }): Promise<void> {
    const res = await fetch('/api/calendar/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete calendar event');
    }
  }
}

export const calendarClient = new CalendarClient();
