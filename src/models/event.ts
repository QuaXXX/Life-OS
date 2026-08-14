// Phase 2: Calendar event data model
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  time: string; // HH:MM
  duration?: number; // minutes
  type: 'class' | 'workout' | 'meal' | 'social' | 'work' | 'other';
  notes?: string;
}
