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
        {/* Header */}
        <div className="calendar-header">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">Calendar</h2>
            <p className="text-xs text-[var(--color-muted)]">Standalone Google Calendar Sync</p>
          </div>

          {!loadingStatus && (
            authStatus.connected ? (
              <div className="flex items-center gap-2">
                <span className="calendar-badge">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  Life OS Calendar
                </span>
                <button onClick={handleDisconnect} className="calendar-btn-secondary text-xs">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={handleConnectGoogle} className="calendar-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.82 3.08-3.78 3.08-2.28 0-4.14-1.86-4.14-4.14s1.86-4.14 4.14-4.14c1.04 0 1.98.39 2.71 1.03l2.05-2.05C18.41 6.36 16.44 5.5 14.18 5.5 9.77 5.5 6.2 9.07 6.2 13.48s3.57 7.98 7.98 7.98c4.6 0 7.64-3.23 7.64-7.78 0-.58-.06-1.12-.17-1.58z" />
                </svg>
                Connect Google Calendar
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
          <div className="calendar-empty-card">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-accent)] mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--color-text)]">Connect Google Calendar</h3>
            <p className="text-xs text-[var(--color-muted)] max-w-xs text-center mt-1 mb-4">
              Life OS will automatically create a dedicated <strong>"Life OS"</strong> calendar in your Google account for safe isolation.
            </p>
            <button onClick={handleConnectGoogle} className="calendar-btn-primary">
              Sign in with Google
            </button>
          </div>
        )}

        {/* Connected Calendar Interface */}
        {authStatus.connected && (
          <>
            {/* Date Navigator */}
            <div className="date-navigator">
              <button onClick={() => changeDateByDays(-1)} className="date-nav-btn" aria-label="Previous day">
                ‹
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
              <button onClick={() => changeDateByDays(1)} className="date-nav-btn" aria-label="Next day">
                ›
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                className="calendar-btn-secondary text-xs"
              >
                Today
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between my-3">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                {events.length} {events.length === 1 ? 'event' : 'events'} on {selectedDate}
              </span>
              <button onClick={handleOpenAddForm} className="calendar-btn-primary text-xs py-1.5 px-3">
                + Add Event
              </button>
            </div>

            {/* Events List */}
            {loadingEvents ? (
              <div className="text-center py-8 text-xs text-[var(--color-muted)]">
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
              <div className="events-list">
                {events.map((evt) => (
                  <div key={evt.id} className="event-card">
                    <div className="event-time-pill">
                      {evt.startTime} - {evt.endTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="event-title">{evt.title}</h4>
                      {evt.description && (
                        <p className="event-desc">{evt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditForm(evt)}
                        className="event-action-btn"
                        title="Edit event"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(evt)}
                        className="event-action-btn danger"
                        title="Delete event"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Add / Edit Modal Form */}
      {isFormOpen && (
        <div className="calendar-modal-overlay">
          <div className="calendar-modal-card">
            <h3 className="text-base font-bold text-[var(--color-text)] mb-3">
              {editingEventId ? 'Edit Calendar Event' : 'Add New Event'}
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Math Test, Gym Session"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Description (Optional)</label>
                <textarea
                  placeholder="Notes, room number, details..."
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="calendar-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="calendar-btn-primary text-xs">
                  Continue to Confirmation →
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
