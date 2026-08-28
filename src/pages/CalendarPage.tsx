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
    <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-[var(--color-bg)] select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer border border-white/[0.05]"
          aria-label="Back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {!loadingStatus && authStatus.connected && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          )}
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Calendar</h2>
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
              className="w-10 h-10 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center text-white/60 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/[0.05]"
              aria-label="Calendar Settings"
              title="Calendar Settings & Options"
            >
              {/* Clean Sliders / Controls icon */}
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

      {/* Date Scrubber Bar */}
      {authStatus.connected && (
        <div className="flex items-center justify-between px-5 py-3 mb-1">
          <button
            onClick={() => scrubDay(-1)}
            className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/[0.04]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <button
              onClick={goToday}
              className="text-[17px] font-semibold text-white tracking-tight hover:text-[var(--color-accent)] transition-colors cursor-pointer"
            >
              {formatDateRelative(selectedDate)}
            </button>
            <p className="text-[11.5px] text-white/35 mt-0.5">{selectedDate}</p>
          </div>

          <button
            onClick={() => scrubDay(1)}
            className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/[0.04]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Content / Agenda List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
        {/* Not connected */}
        {!loadingStatus && !authStatus.connected && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-16 h-16 rounded-3xl bg-[var(--color-surface)] flex items-center justify-center mb-5 border border-white/[0.06] shadow-xl">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-white mb-1.5">Connect Google Calendar</h3>
            <p className="text-[13px] text-white/40 mb-7 leading-relaxed max-w-[260px]">
              Life OS syncs events and reminders seamlessly with your schedule.
            </p>
            <button
              onClick={handleConnect}
              className="px-7 py-3.5 rounded-2xl bg-[var(--color-accent)] text-[#12151a] text-[14px] font-semibold active:scale-95 transition-transform cursor-pointer shadow-lg shadow-[var(--color-accent)]/15 hover:brightness-105"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingStatus && (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        )}

        {/* Connected — Events */}
        {authStatus.connected && !loadingStatus && (
          <div className="space-y-4 pt-1">
            {/* All-Day Banners */}
            {allDayEvents.length > 0 && (
              <div className="space-y-2">
                {allDayEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                    <span className="text-[13.5px] font-medium text-white/90 truncate">{evt.title}</span>
                    <span className="ml-auto text-[11px] text-white/35 font-medium shrink-0">All day</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timed Events */}
            {loadingEvents ? (
              <div className="flex flex-col gap-3 py-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : timedEvents.length === 0 && allDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-3 text-white/25 border border-white/[0.04]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-white/40 mb-1">No events scheduled</p>
                <p className="text-[12px] text-white/20">Ask Life OS to add something to your day.</p>
              </div>
            ) : viewMode === 'timeline' ? (
              /* Timeline Mode */
              <div className="divide-y divide-white/[0.04]">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3.5 py-3.5">
                    <div className="w-1 h-11 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />

                    <div className="w-[74px] shrink-0">
                      <p className="text-[13.5px] font-semibold text-white/85">{formatTime12h(evt.startTime)}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">{formatTime12h(evt.endTime)}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white/95 truncate leading-snug">{evt.title}</p>
                      {evt.description && (
                        <p className="text-[12px] text-white/40 mt-1 truncate">{evt.description}</p>
                      )}
                      {evt.location && (
                        <p className="text-[11px] text-white/30 mt-1 truncate flex items-center gap-1">
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
              <div className="space-y-2.5">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white/90 truncate">{evt.title}</p>
                        {evt.description && <p className="text-[12px] text-white/35 mt-0.5 truncate">{evt.description}</p>}
                      </div>
                    </div>
                    <span className="text-[12.5px] font-semibold text-white/60 shrink-0">
                      {formatTime12h(evt.startTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Settings Bottom Sheet */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-[4px] animate-in fade-in duration-200"
            onClick={() => setIsSettingsOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative w-full bg-[#161a22] border-t border-white/10 rounded-t-[32px] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-250 flex flex-col gap-5 max-h-[80%] overflow-y-auto scrollbar-hide">
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto" />

            {/* Title & Close */}
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white tracking-tight">Calendar Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* View Layout Segmented Control */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35 block mb-2 px-0.5">
                View Layout
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('timeline'); }}
                  className={`py-3 rounded-2xl text-[13.5px] font-medium transition-all text-center cursor-pointer border ${
                    viewMode === 'timeline'
                      ? 'bg-[var(--color-accent)] text-[#12151a] font-semibold border-transparent shadow-sm'
                      : 'bg-white/[0.03] text-white/60 hover:text-white border-white/[0.05]'
                  }`}
                >
                  Timeline View
                </button>
                <button
                  onClick={() => { sensory.tapLight(); setViewMode('compact'); }}
                  className={`py-3 rounded-2xl text-[13.5px] font-medium transition-all text-center cursor-pointer border ${
                    viewMode === 'compact'
                      ? 'bg-[var(--color-accent)] text-[#12151a] font-semibold border-transparent shadow-sm'
                      : 'bg-white/[0.03] text-white/60 hover:text-white border-white/[0.05]'
                  }`}
                >
                  Compact List
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35 block mb-2 px-0.5">
                Actions
              </label>
              
              <div className="space-y-2">
                {/* Sync Button */}
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white text-[13.5px] font-medium flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={isSyncing ? 'animate-spin' : ''}
                      >
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </div>
                    Sync Google Calendar
                  </span>
                  <span className="text-[12px] text-white/40 font-medium">{isSyncing ? 'Syncing...' : 'Refresh'}</span>
                </button>

                {/* Clear Day Button */}
                {!confirmClearDay ? (
                  <button
                    onClick={() => { sensory.tapLight(); setConfirmClearDay(true); }}
                    className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/80 hover:text-white text-[13.5px] font-medium flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </div>
                      Clear Events on {formatDateRelative(selectedDate)}
                    </span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 space-y-3">
                    <p className="text-[13px] text-red-200">Clear ALL events on {formatDateFull(selectedDate)}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearSelectedDay}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[12.5px] font-semibold active:scale-95 transition-all cursor-pointer"
                      >
                        Yes, Clear Day
                      </button>
                      <button
                        onClick={() => setConfirmClearDay(false)}
                        className="py-2.5 px-4 rounded-xl bg-white/10 text-white/70 hover:text-white text-[12.5px] font-medium active:scale-95 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Account */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35 block mb-2 px-0.5">
                Google Account
              </label>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_rgba(93,202,165,0.6)]" />
                  <span className="text-[13.5px] text-white/85 font-medium">Life OS Dedicated Calendar</span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2.5 py-1 rounded-full">
                  Connected
                </span>
              </div>

              {!confirmDisconnect ? (
                <button
                  onClick={() => { sensory.tapLight(); setConfirmDisconnect(true); }}
                  className="w-full py-3.5 rounded-2xl bg-red-500/[0.07] hover:bg-red-500/[0.13] text-red-400 text-[13px] font-medium flex items-center justify-center gap-2 border border-red-500/15 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                  Disconnect Google Calendar
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 space-y-3">
                  <div>
                    <p className="text-[13px] text-red-200 font-medium">Disconnect Google Account?</p>
                    <p className="text-[12px] text-red-300/60 mt-0.5">You will need to sign in again to sync events.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisconnect}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[12.5px] font-semibold active:scale-95 transition-all cursor-pointer shadow"
                    >
                      Yes, Disconnect
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="py-2.5 px-4 rounded-xl bg-white/10 text-white/80 hover:text-white text-[12.5px] font-medium active:scale-95 transition-all cursor-pointer"
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
