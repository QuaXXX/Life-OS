import { useState, useEffect, useCallback } from 'react';
import { calendarClient } from '../services/calendar/CalendarClient';
import type { CalendarEvent, CreateEventInput, AuthStatus } from '../services/calendar/types';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface PageProps {
  onBack: () => void;
}

type ConfirmActionType = 'create' | 'update' | 'delete';

interface PendingAction {
  type: ConfirmActionType;
  title: string;
  detailsText: string;
  data: any;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function CalendarPage({ onBack }: PageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    date: selectedDate,
    startTime: '10:00',
    endTime: '11:00',
    description: '',
  });

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const checkAuth = useCallback(async () => {
    setLoadingStatus(true);
    const status = await calendarClient.getStatus();
    setAuthStatus(status);
    setLoadingStatus(false);
  }, []);

  const loadEvents = useCallback(async () => {
    if (!authStatus.connected) return;
    setLoadingEvents(true);
    setErrorMsg(null);
    try {
      const data = await calendarClient.getEvents({
        startDate: selectedDate,
        endDate: selectedDate,
      });
      setEvents(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, [authStatus.connected, selectedDate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus.connected) {
      loadEvents();
    }
  }, [authStatus.connected, selectedDate, loadEvents]);

  // Navigate Date
  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleOpenAddForm = () => {
    setEditingEventId(null);
    setFormData({
      title: '',
      date: selectedDate,
      startTime: '10:00',
      endTime: '11:00',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setFormData({
      title: evt.title,
      date: evt.date,
      startTime: evt.startTime,
      endTime: evt.endTime,
      description: evt.description || '',
    });
    setIsFormOpen(true);
  };

  // Submit Form -> Trigger Confirmation Step
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingEventId) {
      setPendingAction({
        type: 'update',
        title: 'Confirm Event Update',
        detailsText: `Update "${formData.title}" on ${formData.date} (${formData.startTime} - ${formData.endTime})?`,
        data: { eventId: editingEventId, changes: formData },
      });
    } else {
      setPendingAction({
        type: 'create',
        title: 'Confirm Add Event',
        detailsText: `Add "${formData.title}" to your dedicated "Life OS" Google Calendar on ${formData.date} (${formData.startTime} - ${formData.endTime})?`,
        data: formData,
      });
    }
    setIsFormOpen(false);
  };

  // Trigger Delete -> Confirmation Step
  const handleDeleteClick = (evt: CalendarEvent) => {
    setPendingAction({
      type: 'delete',
      title: 'Confirm Event Deletion',
      detailsText: `Delete "${evt.title}" from your "Life OS" Google Calendar?`,
      data: { eventId: evt.id },
    });
  };

  // User Clicks "Confirm" on the Modal
  const executePendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (action.type === 'create') {
        await calendarClient.createEvent(action.data);
        setSuccessMsg('Event created on Google Calendar!');
      } else if (action.type === 'update') {
        await calendarClient.updateEvent(action.data);
        setSuccessMsg('Event updated on Google Calendar!');
      } else if (action.type === 'delete') {
        await calendarClient.deleteEvent(action.data);
        setSuccessMsg('Event deleted from Google Calendar!');
      }
      await loadEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    await calendarClient.logout();
    await checkAuth();
    setEvents([]);
  };

  return (
    <div className="placeholder-page">
      <button onClick={onBack} className="back-btn" aria-label="Back to home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="calendar-container">
        <div className="calendar-header">
          <div>
            <h2 className="text-[18px] font-bold text-[var(--color-text)] tracking-tight">Calendar</h2>
            <p className="text-[12px] text-[var(--color-muted)] mt-0.5">Standalone Google Calendar Sync</p>
          </div>

          {!loadingStatus && (
            authStatus.connected ? (
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-accent)] opacity-80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  Synced
                </span>
                <button onClick={handleDisconnect} className="text-[12px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={handleConnectGoogle} className="text-[13px] font-semibold text-[var(--color-accent)] flex items-center gap-1.5 hover:brightness-110 transition-all active:scale-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.82 3.08-3.78 3.08-2.28 0-4.14-1.86-4.14-4.14s1.86-4.14 4.14-4.14c1.04 0 1.98.39 2.71 1.03l2.05-2.05C18.41 6.36 16.44 5.5 14.18 5.5 9.77 5.5 6.2 9.07 6.2 13.48s3.57 7.98 7.98 7.98c4.6 0 7.64-3.23 7.64-7.78 0-.58-.06-1.12-.17-1.58z" />
                </svg>
                Connect
              </button>
            )
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="calendar-alert alert-danger">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="calendar-alert alert-success">
            {successMsg}
          </div>
        )}

        {/* Disconnected Placeholder */}
        {!authStatus.connected && !loadingStatus && (
          <div className="flex flex-col items-center justify-center p-8 mt-4 text-center border border-white/5 rounded-2xl bg-[var(--color-surface)]/30">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-accent)] mb-3 border border-[var(--color-accent)]/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Connect Google Calendar</h3>
            <p className="text-[12px] text-[var(--color-muted)] max-w-[240px] mt-1.5 mb-5 leading-snug">
              Life OS will automatically create a dedicated <strong>"Life OS"</strong> calendar in your Google account for safe isolation.
            </p>
            <button onClick={handleConnectGoogle} className="text-[13px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all active:scale-95">
              Sign in with Google →
            </button>
          </div>
        )}

        {/* Connected Calendar Interface */}
        {authStatus.connected && (
          <>
            {/* Date Navigator */}
            <div className="flex items-center justify-between mt-2 mb-6 border-b border-white/5 pb-4">
              <button onClick={() => changeDateByDays(-1)} className="p-2 text-[18px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95">
                ‹
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[14px] font-medium text-[var(--color-text)] text-center outline-none tracking-tight"
              />
              <button onClick={() => changeDateByDays(1)} className="p-2 text-[18px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95">
                ›
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-[var(--color-muted)]">
                {events.length} {events.length === 1 ? 'event' : 'events'}
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className="ml-3 text-[var(--color-accent)] opacity-80 hover:opacity-100 transition-opacity"
                >
                  Today
                </button>
              </span>
              <button onClick={handleOpenAddForm} className="text-[13px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all active:scale-95">
                + Add Event
              </button>
            </div>

            {/* Events List */}
            {loadingEvents ? (
              <div className="text-center py-8 text-[13px] text-[var(--color-muted)]">
                Loading events from Life OS calendar...
              </div>
            ) : events.length === 0 ? (
              <div className="calendar-empty-card py-8">
                <p className="text-xs text-[var(--color-muted)]">No events scheduled for this day.</p>
                <button onClick={handleOpenAddForm} className="text-xs text-[var(--color-accent)] mt-2 hover:underline">
                  + Create your first event
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1 mt-2">
                {events.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-4 group py-2 border-b border-white/5 last:border-0">
                    <div className="w-[85px] shrink-0 pt-0.5">
                      <div className="text-[12px] font-semibold text-[var(--color-accent)] opacity-90 tracking-tight">
                        {formatTime12h(evt.startTime)}
                      </div>
                      <div className="text-[11px] font-medium text-[var(--color-muted)] mt-0.5">
                        {formatTime12h(evt.endTime)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4 className="text-[14px] font-semibold text-[var(--color-text)] tracking-tight leading-snug">{evt.title}</h4>
                      {evt.description && (
                        <p className="text-[12px] text-[var(--color-muted)] mt-1 leading-relaxed truncate">{evt.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditForm(evt)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                        title="Edit event"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(evt)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/10 text-[var(--color-muted)] hover:text-red-400 transition-colors active:scale-95"
                        title="Delete event"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[var(--color-bg)]/95 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-[16px] font-semibold text-[var(--color-text)] tracking-tight mb-4 border-l-2 border-[var(--color-accent)] pl-3">
              {editingEventId ? 'Edit Event' : 'Add Event'}
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym Session"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[var(--color-surface)] border border-transparent focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-[14px] text-[var(--color-text)] outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-[var(--color-surface)] border border-transparent focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-[14px] text-[var(--color-text)] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-[var(--color-surface)] border border-transparent focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-[14px] text-[var(--color-text)] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-[var(--color-surface)] border border-transparent focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-[14px] text-[var(--color-text)] outline-none transition"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-[var(--color-muted)] mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Notes, room number, details..."
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[var(--color-surface)] border border-transparent focus:border-[var(--color-accent)] rounded-xl px-3 py-2 text-[14px] text-[var(--color-text)] outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[13px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button type="submit" className="text-[13px] font-semibold text-[var(--color-accent)] hover:brightness-110 transition-all active:scale-95">
                  Review & Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Step Modal */}
      {pendingAction && (
        <ConfirmModal
          title={pendingAction.title}
          detailsText={pendingAction.detailsText}
          onConfirm={executePendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
