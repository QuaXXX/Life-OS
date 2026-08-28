/**
 * Lightweight toast notification system.
 * Manages a global queue of toast messages rendered by ToastContainer.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let listeners: ToastListener[] = [];
let nextId = 0;

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = `toast-${nextId++}`;
  const toast: ToastMessage = { id, message, type, duration };
  toasts = [...toasts, toast];
  notify();

  setTimeout(() => {
    dismissToast(id);
  }, duration);

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.push(listener);
  listener([...toasts]);
  return () => {
    listeners = listeners.filter((fn) => fn !== listener);
  };
}
