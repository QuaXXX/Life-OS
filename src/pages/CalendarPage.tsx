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
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setLoadingEvents(false);
    }
  }, [authStatus.connected, selectedDate]);

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
      showToast('Calendar synced ✓', 'success');
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
    showToast('Google Calendar disconnected', 'info');
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
      showToast(err.message || 'Failed to clear day', 'error');
    }
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  const allDayEvents = sortedEvents.filter(e => !e.startTime || (e.startTime === '00:00' && e.endTime === '00:00'));
  const timedEvents = sortedEvents.filter(e => e.startTime && !(e.startTime === '00:00' && e.endTime === '00:00'));

  return (
    <div className="placeholder-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active:scale-90 transition-transform" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {!loadingStatus && authStatus.connected && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          )}
          <h2 className="text-[16px] font-semibold text-white tracking-tight">Calendar</h2>
        </div>

        <div className="w-10 flex justify-end">
          {!loadingStatus && authStatus.connected && (
            <button
              onClick={() => {
                sensory.tapLight();
                setIsSettingsOpen(true);
                setConfirmDisconnect(false);
                setConfirmClearDay(false);
              }}
              className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all cursor-pointer"
              aria-label="Calendar Settings"
              title="Calendar Settings & Options"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Day Scrubber */}
      {authStatus.connected && (
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => scrubDay(-1)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 active:scale-90 transition-all cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <button onClick={goToday} className="text-[18px] font-semibold text-white tracking-tight hover:text-[var(--color-accent)] transition-colors cursor-pointer">
              {formatDateRelative(selectedDate)}
            </button>
            <p className="text-[11px] text-white/30 mt-0.5">{selectedDate}</p>
          </div>

          <button onClick={() => scrubDay(1)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 active:scale-90 transition-all cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
        {/* Not connected */}
        {!loadingStatus && !authStatus.connected && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold text-white mb-1">Connect Calendar</h3>
            <p className="text-[13px] text-white/40 mb-6 leading-relaxed max-w-[260px]">
              Life OS creates a dedicated calendar in your Google account to manage events and daily routines.
            </p>
            <button onClick={handleConnect} className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black text-[14px] font-semibold active:scale-95 transition-transform cursor-pointer">
              Sign in with Google
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingStatus && (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        )}

        {/* Connected — Timeline / Compact Views */}
        {authStatus.connected && !loadingStatus && (
          <div className="pb-6">
            {/* All-day / Deadline banners */}
            {allDayEvents.length > 0 && (
              <div className="mb-4 flex flex-col gap-1.5">
                {allDayEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                    <span className="text-[13px] font-medium text-white/85 truncate">{evt.title}</span>
                    <span className="ml-auto text-[11px] text-white/35 shrink-0">All day</span>
                  </div>
                ))}
              </div>
            )}

            {/* Loading events */}
            {loadingEvents ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : timedEvents.length === 0 && allDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-white/40 mb-1">No events scheduled</p>
                <p className="text-[12px] text-white/20">Ask Life OS to add an event or task.</p>
              </div>
            ) : viewMode === 'timeline' ? (
              /* Timeline Mode */
              <div className="flex flex-col gap-1">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-1 h-10 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />

                    <div className="w-[72px] shrink-0">
                      <p className="text-[13px] font-semibold text-white/80">{formatTime12h(evt.startTime)}</p>
                      <p className="text-[11px] text-white/35">{formatTime12h(evt.endTime)}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white/90 truncate leading-snug">{evt.title}</p>
                      {evt.description && (
                        <p className="text-[12px] text-white/40 mt-0.5 truncate">{evt.description}</p>
                      )}
                      {evt.location && (
                        <p className="text-[11px] text-white/30 mt-0.5 truncate flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {evt.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Compact List Mode */
              <div className="flex flex-col gap-2">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-white/90 truncate">{evt.title}</p>
                        {evt.description && <p className="text-[11.5px] text-white/35 truncate">{evt.description}</p>}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-white/60 shrink-0">
                      {formatTime12h(evt.startTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Settings & Options Bottom Sheet */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[60] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px] animate-in fade-in"
            onClick={() => setIsSettingsOpen(false)}
          />

          <div className="relative bg-[#1a1e25] rounded-t-[28px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pb-safe max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-semibold text-white tracking-tight">Calendar Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white active:scale-95 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="mb-5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-white/40 block mb-2">
                View Layout
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('timeline'); }}
                  className={`py-2 px-3 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                    viewMode === 'timeline'
                      ? 'bg-[var(--color-accent)] text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Timeline View
                </button>
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('compact'); }}
                  className={`py-2 px-3 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                    viewMode === 'compact'
                      ? 'bg-[var(--color-accent)] text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Compact List
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-5 flex flex-col gap-2">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-white/40 block mb-1">
                Actions
              </label>
              
              {/* Sync Button */}
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[13.5px] font-medium flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    className={isSyncing ? 'animate-spin' : ''}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sync Google Calendar
                </span>
                <span className="text-[12px] text-white/40">{isSyncing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              {/* Clear Day Button */}
              {!confirmClearDay ? (
                <button
                  onClick={() => { sensory.tapLight(); setConfirmClearDay(true); }}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[13.5px] font-medium flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Clear Events on {formatDateRelative(selectedDate)}
                  </span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-[12.5px] text-red-300 mb-2">Delete ALL events on {formatDateFull(selectedDate)}?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearSelectedDay}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12px] font-semibold active:scale-95 transition-all cursor-pointer"
                    >
                      Yes, Clear Day
                    </button>
                    <button
                      onClick={() => setConfirmClearDay(false)}
                      className="py-2 px-3 rounded-lg bg-white/10 text-white/70 text-[12px] font-medium active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Info & Disconnect */}
            <div className="pt-3 border-t border-white/10">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-white/40 block mb-2">
                Google Account
              </label>

              <div className="flex items-center justify-between py-2 px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                  <span className="text-[13px] text-white/80 font-medium">Life OS Dedicated Calendar</span>
                </div>
                <span className="text-[11px] text-[var(--color-accent)] font-semibold uppercase tracking-wider">Connected</span>
              </div>

              {!confirmDisconnect ? (
                <button
                  onClick={() => { sensory.tapLight(); setConfirmDisconnect(true); }}
                  className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-400 text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                  Disconnect Google Calendar
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30">
                  <p className="text-[13px] text-red-200 font-medium mb-1">Disconnect Google Account?</p>
                  <p className="text-[11.5px] text-red-300/70 mb-3">You will need to sign in again to sync events.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisconnect}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12.5px] font-semibold active:scale-95 transition-all cursor-pointer"
                    >
                      Yes, Disconnect
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="py-2 px-4 rounded-lg bg-white/10 text-white/80 text-[12.5px] font-medium active:scale-95 transition-all cursor-pointer"
                    >
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
