/**
 * Type definitions for Google Tasks API integration.
 */

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;       // RFC 3339 date string
  status: 'needsAction' | 'completed';
  completed?: string; // RFC 3339 timestamp
  position?: string;
  updated?: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  due?: string;       // YYYY-MM-DD
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}
