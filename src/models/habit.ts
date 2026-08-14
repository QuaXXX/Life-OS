// Phase 2: Habit tracking data model
export interface HabitEntry {
  id: string;
  date: string; // ISO date
  type: 'workout' | 'sleep' | 'meal';
  data: Record<string, unknown>;
}
