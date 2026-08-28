import type { Task, CreateTaskInput, UpdateTaskInput } from './types';

function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export class TasksClient {
  /**
   * Fetch tasks, optionally filtered by due date range
   */
  async getTasks(options?: {
    dueMin?: string;
    dueMax?: string;
    showCompleted?: boolean;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (options?.dueMin) params.set('dueMin', options.dueMin);
    if (options?.dueMax) params.set('dueMax', options.dueMax);
    if (options?.showCompleted) params.set('showCompleted', 'true');
    params.set('timeZone', getClientTimeZone());

    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch tasks');
    }
    const data = await res.json();
    return data.tasks || [];
  }

  /**
   * Create a new task in Google Tasks
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create task');
    }
    const data = await res.json();
    return data.task;
  }

  /**
   * Update an existing task
   */
  async updateTask(input: UpdateTaskInput): Promise<Task> {
    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update task');
    }
    const data = await res.json();
    return data.task;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const res = await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete task');
    }
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskId: string): Promise<Task> {
    return this.updateTask({ taskId, status: 'completed' });
  }
}

export const tasksClient = new TasksClient();
