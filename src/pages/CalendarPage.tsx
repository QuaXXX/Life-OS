import { useState, useEffect, useCallback } from 'react';
import { calendarClient } from '../services/calendar/CalendarClient';
import type { CalendarEvent, AuthStatus } from '../services/calendar/types';
import { formatTime12h, formatDateRelative, addDays, formatDateISO, formatDateFull } from '../utils/dateTime';
import { showToast } from '../utils/toast';
import { sensory } from '../utils/sensory';

interface PageProps {
  onBack: () => void;
}

type CalendarViewMode = 'timeline' | 'compact';

const colorMap: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
};

function getEventColor(colorId?: string): string {
  return colorMap[colorId || '1'] || colorMap['1'];
}

export function CalendarPage({ onBack }: PageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('timeline');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmClearDay, setConfirmClearDay] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkAuth = useCallback(async () => {
    setLoadingStatus(true);
    const status = await calendarClient.getStatus();
    setAuthStatus(status);
    setLoadingStatus(false);
  }, []);

  /** Handle auth errors (invalid_grant, expired tokens) gracefully */
  const handleAuthError = useCallback(async (err: any) => {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('invalid_grant') || msg.includes('token') || msg.includes('unauthorized')) {
      // Token expired/revoked — silently log out and reset
      try { await calendarClient.logout(); } catch {}
      setAuthStatus({ connected: false });
      setEvents([]);
      showToast('Session expired — please reconnect', 'info');
      return true;
    }
    return false;
  }, []);

  const loadEvents = useCallback(async () => {
    if (!authStatus.connected) return;
    setLoadingEvents(true);
    try {
      const data = await calendarClient.getEvents({
        startDate: selectedDate,
        endDate: selectedDate,
      });
      setEvents(data);
    } catch (err: any) {
      const handled = await handleAuthError(err);
      if (!handled) {
        showToast('Couldn\'t load events', 'error');
      }
    } finally {
      setLoadingEvents(false);
    }
  }, [authStatus.connected, selectedDate, handleAuthError]);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (authStatus.connected) loadEvents(); }, [authStatus.connected, selectedDate, loadEvents]);

  const goToday = () => {
    sensory.tapLight();
    setSelectedDate(formatDateISO(new Date()));
  };

  const scrubDay = (dir: number) => {
    sensory.tapLight();
    setSelectedDate(addDays(selectedDate, dir));
  };

  const handleConnect = () => { window.location.href = '/api/auth/google'; };

  const handleManualSync = async () => {
    sensory.tapLight();
    setIsSyncing(true);
    try {
      await loadEvents();
      sensory.tapSuccess();
      showToast('Synced', 'success');
    } catch {
      sensory.tapWarning();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    sensory.tapWarning();
    await calendarClient.logout();
    await checkAuth();
    setEvents([]);
    setIsSettingsOpen(false);
    setConfirmDisconnect(false);
    showToast('Disconnected', 'info');
  };

  const handleClearSelectedDay = async () => {
    sensory.tapWarning();
    try {
      const res = await calendarClient.clearCalendarDay({ date: selectedDate });
      sensory.tapSuccess();
      showToast(`Cleared ${res.count} event(s)`, 'success');
      setEvents([]);
      setConfirmClearDay(false);
      setIsSettingsOpen(false);
    } catch (err: any) {
      const handled = await handleAuthError(err);
      if (!handled) showToast('Failed to clear', 'error');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  const allDayEvents = sortedEvents.filter(e => !e.startTime || (e.startTime === '00:00' && e.endTime === '00:00'));
  const timedEvents = sortedEvents.filter(e => e.startTime && !(e.startTime === '00:00' && e.endTime === '00:00'));

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h2 className="text-[17px] font-semibold text-white tracking-tight">Calendar</h2>

        <div className="w-10">
          {!loadingStatus && authStatus.connected && (
            <button
              onClick={() => {
                sensory.tapLight();
                setIsSettingsOpen(true);
                setConfirmDisconnect(false);
                setConfirmClearDay(false);
              }}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] active:scale-90 transition-transform cursor-pointer"
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Date scrubber ── */}
      {authStatus.connected && (
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => scrubDay(-1)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] active:scale-90 transition-transform cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <button onClick={goToday} className="text-[16px] font-semibold text-white tracking-tight cursor-pointer">
              {formatDateRelative(selectedDate)}
            </button>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{selectedDate}</p>
          </div>

          <button
            onClick={() => scrubDay(1)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] active:scale-90 transition-transform cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
        {/* Not connected */}
        {!loadingStatus && !authStatus.connected && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-white mb-1.5">Connect Calendar</h3>
            <p className="text-[13px] text-[var(--color-muted)] mb-6 max-w-[240px] leading-relaxed">
              Sync your schedule, reminders, and routines with Google Calendar.
            </p>
            <button
              onClick={handleConnect}
              className="px-6 py-3 rounded-2xl bg-[var(--color-accent)] text-[#12151a] text-[14px] font-semibold active:scale-95 transition-transform cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {/* Loading */}
        {loadingStatus && (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
            ))}
          </div>
        )}

        {/* Events */}
        {authStatus.connected && !loadingStatus && (
          <>
            {/* All-day */}
            {allDayEvents.map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-[var(--color-surface)]">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                <span className="text-[13px] font-medium text-white/90 truncate flex-1">{evt.title}</span>
                <span className="text-[11px] text-[var(--color-muted)] shrink-0">All day</span>
              </div>
            ))}

            {loadingEvents ? (
              <div className="flex flex-col gap-3 pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
                ))}
              </div>
            ) : timedEvents.length === 0 && allDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-[var(--color-muted)] mb-0.5">Nothing scheduled</p>
                <p className="text-[12px] text-[var(--color-muted)] opacity-60">Ask Life OS to add something.</p>
              </div>
            ) : viewMode === 'timeline' ? (
              <div className="mt-1">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-1 h-10 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                    <div className="w-[70px] shrink-0">
                      <p className="text-[13px] font-semibold text-white/85">{formatTime12h(evt.startTime)}</p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{formatTime12h(evt.endTime)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white/95 truncate">{evt.title}</p>
                      {evt.description && <p className="text-[12px] text-[var(--color-muted)] mt-0.5 truncate">{evt.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--color-surface)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                      <p className="text-[13px] font-medium text-white/90 truncate">{evt.title}</p>
                    </div>
                    <span className="text-[12px] font-semibold text-[var(--color-muted)] shrink-0">{formatTime12h(evt.startTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Settings sheet ── */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsSettingsOpen(false)} />

          <div className="relative bg-[var(--color-surface)] rounded-t-3xl px-5 pt-4 pb-8 flex flex-col gap-6 max-h-[75%] overflow-y-auto scrollbar-hide">
            {/* Grab handle */}
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto" />

            {/* View toggle */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)] mb-2">View</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('timeline'); }}
                  className={`py-2.5 rounded-xl text-[13px] font-medium text-center cursor-pointer transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-[var(--color-accent)] text-[#12151a] font-semibold'
                      : 'bg-[var(--color-bg)] text-[var(--color-muted)]'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('compact'); }}
                  className={`py-2.5 rounded-xl text-[13px] font-medium text-center cursor-pointer transition-all ${
                    viewMode === 'compact'
                      ? 'bg-[var(--color-accent)] text-[#12151a] font-semibold'
                      : 'bg-[var(--color-bg)] text-[var(--color-muted)]'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)] mb-2">Actions</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-bg)] text-white text-[13px] font-medium active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <span>Sync Calendar</span>
                  <span className="text-[12px] text-[var(--color-muted)]">{isSyncing ? 'Syncing…' : ''}</span>
                </button>

                {!confirmClearDay ? (
                  <button
                    onClick={() => { sensory.tapLight(); setConfirmClearDay(true); }}
                    className="flex items-center px-4 py-3 rounded-xl bg-[var(--color-bg)] text-white/80 text-[13px] font-medium active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    Clear {formatDateRelative(selectedDate)}
                  </button>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-[var(--color-danger)]/10">
                    <p className="text-[13px] text-[var(--color-danger)] mb-2">Clear all events on {formatDateFull(selectedDate)}?</p>
                    <div className="flex gap-2">
                      <button onClick={handleClearSelectedDay} className="flex-1 py-2 rounded-lg bg-[var(--color-danger)] text-white text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer">
                        Clear
                      </button>
                      <button onClick={() => setConfirmClearDay(false)} className="py-2 px-4 rounded-lg bg-white/10 text-white/70 text-[12px] font-medium active:scale-95 transition-transform cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-muted)] mb-2">Account</p>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-bg)] mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <span className="text-[13px] text-white/85 font-medium">Life OS Calendar</span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-accent)]">Connected</span>
              </div>

              {!confirmDisconnect ? (
                <button
                  onClick={() => { sensory.tapLight(); setConfirmDisconnect(true); }}
                  className="w-full py-2.5 rounded-xl text-[var(--color-danger)] text-[13px] font-medium text-center active:scale-[0.98] transition-transform cursor-pointer"
                >
                  Disconnect
                </button>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-[var(--color-danger)]/10">
                  <p className="text-[13px] text-[var(--color-danger)] mb-2">Disconnect your Google Account?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDisconnect} className="flex-1 py-2 rounded-lg bg-[var(--color-danger)] text-white text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer">
                      Disconnect
                    </button>
                    <button onClick={() => setConfirmDisconnect(false)} className="py-2 px-4 rounded-lg bg-white/10 text-white/70 text-[12px] font-medium active:scale-95 transition-transform cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
